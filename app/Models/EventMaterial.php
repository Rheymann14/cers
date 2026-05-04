<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventMaterial extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_id',
        'original_name',
        'path',
        'mime_type',
        'size',
        'created_by_user_id',
    ];

    protected $appends = [
        'url',
    ];

    public function getUrlAttribute(): string
    {
        return asset('storage/'.$this->path);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
