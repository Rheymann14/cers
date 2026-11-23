<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventFeedbackAnswer extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'event_feedback_response_id',
        'event_feedback_question_id',
        'rating',
    ];

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
        ];
    }

    public function response(): BelongsTo
    {
        return $this->belongsTo(EventFeedbackResponse::class, 'event_feedback_response_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(EventFeedbackQuestion::class, 'event_feedback_question_id');
    }
}
