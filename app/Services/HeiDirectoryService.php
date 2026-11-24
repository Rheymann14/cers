<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

/**
 * Reads the official CHED XII HEI list from one of two sources, chosen by
 * services.hei_directory.source:
 *
 * - "portal": GET {PORTAL_BASE_URL}/fetch-all-hei with the PORTAL-API key header
 *   → [{ instCode, instName, province, municipalityCity, ... }]
 * - "auther_space": public GET {AUTHER_SPACE_URL}/api/heis
 *   → { data: [{ uii, name, province, city_municipality }] }
 *
 * Both are normalized to { uii, name, province, city_municipality, key }.
 */
class HeiDirectoryService
{
    public const SOURCE_PORTAL = 'portal';

    public const SOURCE_AUTHER_SPACE = 'auther_space';

    /**
     * @return Collection<int, array{uii: string, name: string, province: ?string, city_municipality: ?string, key: string}>
     */
    public function all(): Collection
    {
        $source = $this->source();
        $cacheKey = "hei_directory.{$source}";
        $lastGoodCacheKey = "hei_directory.{$source}.last_good";

        try {
            $heis = Cache::remember(
                $cacheKey,
                now()->addHours(6),
                function () use ($source, $lastGoodCacheKey): array {
                    $heis = $source === self::SOURCE_PORTAL
                        ? $this->fetchFromPortal()
                        : $this->fetchFromAutherSpace();
                    Cache::forever($lastGoodCacheKey, $heis);

                    return $heis;
                },
            );
        } catch (Throwable $exception) {
            $heis = Cache::get($lastGoodCacheKey);

            if (! is_array($heis)) {
                throw $exception;
            }

            Log::warning('HEI directory refresh failed; using last good copy.', [
                'source' => $source,
                'error' => $exception->getMessage(),
            ]);
        }

        return collect($heis);
    }

    /**
     * Normalizes a school name the same way organization slugs are built,
     * so directory names and registration names can be compared.
     */
    public static function key(?string $name): string
    {
        return Str::slug(Str::ascii(trim((string) $name)));
    }

    private function source(): string
    {
        $source = Str::lower(trim((string) config('services.hei_directory.source', self::SOURCE_PORTAL)));

        return $source === self::SOURCE_AUTHER_SPACE ? self::SOURCE_AUTHER_SPACE : self::SOURCE_PORTAL;
    }

    /**
     * @return array<int, array{uii: string, name: string, province: ?string, city_municipality: ?string, key: string}>
     */
    private function fetchFromPortal(): array
    {
        $apiKey = (string) config('services.portal.api_key', '');

        if ($apiKey === '') {
            throw new RuntimeException('PORTAL_API_KEY is not configured.');
        }

        $url = rtrim((string) config('services.portal.base_url'), '/').'/fetch-all-hei';
        $verifySsl = filter_var(
            config('services.portal.verify_ssl', true),
            FILTER_VALIDATE_BOOL,
            FILTER_NULL_ON_FAILURE,
        ) ?? true;

        $response = Http::acceptJson()
            ->withHeaders(['PORTAL-API' => $apiKey])
            ->withOptions(['verify' => $verifySsl])
            ->timeout(20)
            ->retry(2, 300, throw: false)
            ->get($url);

        if (! $response->successful()) {
            throw new RuntimeException("Portal HEI list returned HTTP {$response->status()}.");
        }

        $rows = $response->json();

        // The portal sometimes returns the JSON array as a string prefixed with "Array".
        if (is_string($rows) && str_starts_with($rows, 'Array[')) {
            $rows = json_decode(substr($rows, 5), true);
        }

        if (! is_array($rows)) {
            throw new RuntimeException('Portal HEI list returned an unexpected payload.');
        }

        return $this->normalize($rows, [
            'uii' => 'instCode',
            'name' => 'instName',
            'province' => 'province',
            'city_municipality' => 'municipalityCity',
        ]);
    }

    /**
     * @return array<int, array{uii: string, name: string, province: ?string, city_municipality: ?string, key: string}>
     */
    private function fetchFromAutherSpace(): array
    {
        $url = rtrim((string) config('services.auther_space.base_url'), '/').'/api/heis';

        $response = Http::acceptJson()
            ->timeout(10)
            ->retry(2, 200, throw: false)
            ->get($url);

        if (! $response->successful()) {
            throw new RuntimeException("HEI directory returned HTTP {$response->status()}.");
        }

        $rows = $response->json('data') ?? $response->json();

        if (! is_array($rows)) {
            throw new RuntimeException('HEI directory returned an unexpected payload.');
        }

        return $this->normalize($rows, [
            'uii' => 'uii',
            'name' => 'name',
            'province' => 'province',
            'city_municipality' => 'city_municipality',
        ]);
    }

    /**
     * @param  array<mixed>  $rows
     * @param  array{uii: string, name: string, province: string, city_municipality: string}  $fields
     * @return array<int, array{uii: string, name: string, province: ?string, city_municipality: ?string, key: string}>
     */
    private function normalize(array $rows, array $fields): array
    {
        return collect($rows)
            ->filter(fn ($row) => is_array($row) && filled($row[$fields['name']] ?? null))
            ->map(fn (array $row) => [
                'uii' => trim((string) ($row[$fields['uii']] ?? '')),
                'name' => trim((string) $row[$fields['name']]),
                'province' => $row[$fields['province']] ?? null,
                'city_municipality' => $row[$fields['city_municipality']] ?? null,
                'key' => self::key($row[$fields['name']]),
            ])
            ->unique('key')
            ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
            ->values()
            ->all();
    }
}
