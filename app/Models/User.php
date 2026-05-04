<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Fortify\TwoFactorAuthenticatable;

#[Fillable([
    'name',
    'participant_id',
    'given_name',
    'middle_name',
    'surname',
    'email',
    'avatar',
    'phone',
    'province_id',
    'municipality_id',
    'organization_id',
    'organization',
    'position',
    'participant_type',
    'sex',
    'event_name',
    'event_id',
    'is_active',
    'registration_consent_accepted_at',
    'password',
])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, SoftDeletes, TwoFactorAuthenticatable;

    /**
     * Determine if the user should be treated as an administrator.
     */
    public function isAdministrator(): bool
    {
        return in_array($this->normalizeParticipantType($this->participant_type), ['admin', 'administrator'], true);
    }

    public function setParticipantTypeAttribute(?string $value): void
    {
        $this->attributes['participant_type'] = $this->normalizeParticipantType($value);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function province(): BelongsTo
    {
        return $this->belongsTo(Province::class);
    }

    public function municipality(): BelongsTo
    {
        return $this->belongsTo(Municipality::class);
    }

    private function normalizeParticipantType(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $participantType = Str::slug($value);

        if ($participantType === 'administrator') {
            return 'admin';
        }

        return $participantType === '' ? null : $participantType;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'is_active' => 'boolean',
            'registration_consent_accepted_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }
}
