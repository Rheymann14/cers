<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventCertificate extends Model
{
    public const TYPES = ['appearance', 'participation'];

    public const MAX_SIGNATORIES = 3;

    protected $fillable = [
        'event_id',
        'logo_path',
        'appearance_background_path',
        'participation_background_path',
        'appearance_content',
        'participation_content',
        'signatories',
        'updated_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'appearance_content' => 'array',
            'participation_content' => 'array',
            'signatories' => 'array',
        ];
    }

    /**
     * @return array<string, array<string, string|int>>
     */
    public static function defaultContent(): array
    {
        return [
            'appearance' => [
                'title' => 'CERTIFICATE OF APPEARANCE',
                'intro' => 'This is to certify that',
                'body' => 'has appeared during the conduct of {event} on {date} at {venue}.',
                'footer' => 'Given this {given_date} at {venue}.',
                'vertical_offset' => 0,
            ],
            'participation' => [
                'title' => 'CERTIFICATE OF PARTICIPATION',
                'intro' => 'This certificate is hereby given to',
                'body' => 'for actively participating in {event} on {date} at {venue}.',
                'footer' => 'Given this {given_date} at {venue}.',
                'vertical_offset' => 0,
            ],
        ];
    }

    /**
     * The certificate settings shape shared with the frontend, with defaults
     * filled in for events that have not been configured yet.
     *
     * @return array<string, mixed>
     */
    public static function templateFor(Event $event): array
    {
        $certificate = $event->certificate;
        $defaults = self::defaultContent();

        return [
            'is_configured' => $certificate !== null,
            'logo_url' => self::assetUrl($certificate?->logo_path),
            'appearance_background_url' => self::assetUrl($certificate?->appearance_background_path),
            'participation_background_url' => self::assetUrl($certificate?->participation_background_path),
            'appearance' => [...$defaults['appearance'], ...($certificate?->appearance_content ?? [])],
            'participation' => [...$defaults['participation'], ...($certificate?->participation_content ?? [])],
            'signatories' => collect($certificate?->signatories ?? [])
                ->map(fn (array $signatory) => [
                    'name' => $signatory['name'] ?? '',
                    'position' => $signatory['position'] ?? '',
                    'signature_path' => $signatory['signature_path'] ?? null,
                    'signature_url' => self::assetUrl($signatory['signature_path'] ?? null),
                ])
                ->values()
                ->all(),
            'updated_at' => $certificate?->updated_at?->toIso8601String(),
        ];
    }

    public static function assetUrl(?string $path): ?string
    {
        return $path ? route('certificates.assets', $path) : null;
    }

    /**
     * @return list<string>
     */
    public function storedPaths(): array
    {
        return collect([
            $this->logo_path,
            $this->appearance_background_path,
            $this->participation_background_path,
            ...collect($this->signatories ?? [])->pluck('signature_path'),
        ])->filter()->values()->all();
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_user_id');
    }
}
