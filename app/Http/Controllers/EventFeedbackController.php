<?php

namespace App\Http\Controllers;

use App\Models\EventFeedbackForm;
use App\Models\EventFeedbackQuestion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The public feedback form that participants reach by scanning the event's QR code.
 */
class EventFeedbackController extends Controller
{
    public function show(string $token): Response
    {
        $form = $this->findForm($token);

        return Inertia::render('feedback_form', [
            'form' => [
                'token' => $form->token,
                'title' => $form->title,
                'description' => $form->description,
                'is_open' => $form->is_open,
                'questions' => $form->questions
                    ->map(fn (EventFeedbackQuestion $question) => [
                        'id' => $question->id,
                        'question' => $question->question,
                    ])
                    ->values(),
            ],
            'event' => [
                'name' => $form->event->name,
                'venue_name' => $form->event->venue_name,
                'date_label' => $form->event->dateLabel(),
                'image_url' => $form->event->image_url,
            ],
        ]);
    }

    public function store(Request $request, string $token): RedirectResponse
    {
        $form = $this->findForm($token);

        if (! $form->is_open) {
            throw ValidationException::withMessages([
                'form' => 'This feedback form is no longer accepting responses.',
            ]);
        }

        $ratingRules = [];
        $ratingMessages = [];

        foreach ($form->questions as $index => $question) {
            $ratingRules["ratings.{$question->id}"] = ['required', 'integer', 'between:1,5'];
            $ratingMessages["ratings.{$question->id}.required"] = 'Please rate question '.($index + 1).'.';
            $ratingMessages["ratings.{$question->id}.*"] = 'Please choose 1 to 5 stars for question '.($index + 1).'.';
        }

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:150'],
            'school_agency' => ['nullable', 'string', 'max:255'],
            'comments' => ['nullable', 'string', 'max:2000'],
            'ratings' => ['required', 'array'],
            ...$ratingRules,
        ], [
            'ratings.required' => 'Please rate every question.',
            ...$ratingMessages,
        ]);

        DB::transaction(function () use ($form, $validated) {
            $response = $form->responses()->create([
                'name' => $this->clean($validated['name'] ?? null),
                'school_agency' => $this->clean($validated['school_agency'] ?? null),
                'comments' => $this->clean($validated['comments'] ?? null),
            ]);

            $response->answers()->createMany(
                $form->questions->map(fn (EventFeedbackQuestion $question) => [
                    'event_feedback_question_id' => $question->id,
                    'rating' => (int) $validated['ratings'][$question->id],
                ])->all(),
            );
        });

        return back();
    }

    private function findForm(string $token): EventFeedbackForm
    {
        return EventFeedbackForm::query()
            // Codes are stored lowercase; accept any case people type (phones often capitalize).
            ->where('token', strtolower($token))
            ->with(['questions', 'event'])
            ->firstOrFail();
    }

    private function clean(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }
}
