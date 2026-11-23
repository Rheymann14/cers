<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EventFeedbackQuestion extends Model
{
    protected $fillable = [
        'event_feedback_form_id',
        'question',
        'position',
    ];

    public function form(): BelongsTo
    {
        return $this->belongsTo(EventFeedbackForm::class, 'event_feedback_form_id');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(EventFeedbackAnswer::class);
    }
}
