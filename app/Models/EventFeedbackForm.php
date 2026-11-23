<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EventFeedbackForm extends Model
{
    public const MAX_QUESTIONS = 20;

    public const DEFAULT_QUESTIONS = [
        'Overall, how satisfied are you with the event?',
        'The topics discussed were relevant and useful.',
        'The resource speakers were knowledgeable and engaging.',
        'The venue, schedule, and logistics were well organized.',
        'The food and refreshments were satisfactory.',
    ];

    protected $fillable = [
        'event_id',
        'token',
        'title',
        'description',
        'is_open',
        'created_by_user_id',
        'updated_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'is_open' => 'boolean',
        ];
    }

    /**
     * Letters and digits that can't be mistaken for each other when typed (no 0/o, 1/l/i).
     */
    private const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

    /**
     * Pattern for the link code: lowercase letters, digits and single hyphens.
     */
    public const CODE_PATTERN = '/^[a-z0-9]+(?:-[a-z0-9]+)*$/';

    /**
     * A short, easy-to-type unique code for the public link, e.g. "k7m2qx".
     */
    public static function newToken(int $length = 6): string
    {
        do {
            $token = collect(range(1, $length))
                ->map(fn () => self::CODE_ALPHABET[random_int(0, strlen(self::CODE_ALPHABET) - 1)])
                ->implode('');
        } while (self::query()->where('token', $token)->exists());

        return $token;
    }

    public function publicUrl(): string
    {
        return route('event-feedback.show', $this->token);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function questions(): HasMany
    {
        return $this->hasMany(EventFeedbackQuestion::class)
            ->orderBy('position')
            ->orderBy('id');
    }

    public function responses(): HasMany
    {
        return $this->hasMany(EventFeedbackResponse::class);
    }
}
