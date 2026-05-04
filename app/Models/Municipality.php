<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['province_id', 'name', 'code', 'type', 'is_active'])]
class Municipality extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function province(): BelongsTo
    {
        return $this->belongsTo(Province::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
