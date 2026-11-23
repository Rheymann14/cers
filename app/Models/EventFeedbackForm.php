<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class EventFeedbackForm extends Model
{
    public const MAX_QUESTIONS = 20;

    public const DEFAULT_QUESTIONS = [
        'Overall, how satisfied are you with the event?',
        'The topics discussed were relevant and useful.',
        'The resource speakers were knowledgeable and engaging.',
        'The venue, schedule, and logistics were well organized.',
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

    public static function newToken(): string
    {
        do {
            $token = Str::lower(Str::random(24));
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
