<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Event extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'venue_name',
        'venue_address',
        'venue_map_link',
        'venue_latitude',
        'venue_longitude',
        'starts_at',
        'ends_at',
        'image_path',
        'pdf_path',
        'is_active',
        'is_registration_closed',
        'created_by_user_id',
    ];

    protected $appends = [
        'image_url',
        'pdf_url',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'is_registration_closed' => 'boolean',
            'venue_latitude' => 'decimal:7',
            'venue_longitude' => 'decimal:7',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path ? asset('storage/'.$this->image_path) : null;
    }

    public function getPdfUrlAttribute(): ?string
    {
        return $this->pdf_path ? asset('storage/'.$this->pdf_path) : null;
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(EventRegistration::class);
    }

    public function registeredUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'event_registrations')
            ->withPivot([
                'organization_id',
                'organization',
                'position',
                'participant_type',
                'registration_consent_accepted_at',
            ])
            ->withTimestamps();
    }

    public function participantTypes(): HasMany
    {
        return $this->hasMany(ParticipantType::class);
    }

    public function organizations(): HasMany
    {
        return $this->hasMany(Organization::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(EventAttendance::class);
    }

    public function materials(): HasMany
    {
        return $this->hasMany(EventMaterial::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
