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
 * Reads the official HEI list from the CHED XII portal (Auther Space).
 *
 * Public endpoint: GET {AUTHER_SPACE_URL}/api/heis
 * → { data: [{ uii, name, province, city_municipality }] }
 */
class HeiDirectoryService
{
    private const CACHE_KEY = 'hei_directory';

    private const LAST_GOOD_CACHE_KEY = 'hei_directory.last_good';

    /**
     * @return Collection<int, array{uii: string, name: string, province: ?string, city_municipality: ?string, key: string}>
     */
    public function all(): Collection
    {
        try {
            $heis = Cache::remember(
                self::CACHE_KEY,
                now()->addHours(6),
                function (): array {
                    $heis = $this->fetch();
                    Cache::forever(self::LAST_GOOD_CACHE_KEY, $heis);

                    return $heis;
                },
            );
        } catch (Throwable $exception) {
            $heis = Cache::get(self::LAST_GOOD_CACHE_KEY);

            if (! is_array($heis)) {
                throw $exception;
            }

            Log::warning('HEI directory refresh failed; using last good copy.', [
                'error' => $exception->getMessage(),
            ]);
        }

        return collect($heis);
    }

    /**
     * Normalizes a school name the same way organization slugs are built,
     * so portal names and registration names can be compared.
     */
    public static function key(?string $name): string
    {
        return Str::slug(Str::ascii(trim((string) $name)));
    }

    /**
     * @return array<int, array{uii: string, name: string, province: ?string, city_municipality: ?string, key: string}>
     */
    private function fetch(): array
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

        return collect($rows)
            ->filter(fn ($row) => is_array($row) && filled($row['name'] ?? null))
            ->map(fn (array $row) => [
                'uii' => (string) ($row['uii'] ?? ''),
                'name' => trim((string) $row['name']),
                'province' => $row['province'] ?? null,
                'city_municipality' => $row['city_municipality'] ?? null,
                'key' => self::key($row['name']),
            ])
            ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
            ->values()
            ->all();
    }
}
