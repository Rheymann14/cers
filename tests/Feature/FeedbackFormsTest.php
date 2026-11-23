<?php

use App\Models\Event;
use App\Models\EventFeedbackForm;
use App\Models\EventFeedbackResponse;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function feedbackAdmin(): User
{
    return User::factory()->create([
        'participant_type' => 'admin',
        'organization' => 'Sample University',
    ]);
}

function feedbackEvent(): Event
{
    return Event::query()->create([
        'name' => 'Feedback Test Event',
        'slug' => 'feedback-test-event',
        'venue_name' => 'PICC',
        'starts_at' => '2026-11-24 01:00:00',
        'ends_at' => '2026-11-25 09:00:00',
        'is_active' => true,
    ]);
}

function createFeedbackForm(Event $event, array $questions = ['Was it useful?', 'Was it organized?'], bool $open = true): EventFeedbackForm
{
    test()->actingAs(feedbackAdmin())
        ->put(route('feedback-forms.update', $event), [
            'title' => 'Event Feedback',
            'description' => 'Tell us how we did.',
            'is_open' => $open,
            'questions' => array_map(fn (string $question) => ['question' => $question], $questions),
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    auth()->logout();

    return $event->feedbackForm()->with('questions')->firstOrFail();
}

test('an admin can create a feedback form that generates a public link', function () {
    $event = feedbackEvent();
    $form = createFeedbackForm($event);

    expect($form->token)->not->toBeEmpty()
        ->and($form->is_open)->toBeTrue()
        ->and($form->questions->pluck('question')->all())->toBe(['Was it useful?', 'Was it organized?']);

    $this->actingAs(feedbackAdmin())
        ->get(route('feedback-forms', ['event' => $event->slug]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('feedback_forms')
            ->where('form.url', route('event-feedback.show', $form->token))
            ->where('selectedEvent.date_label', 'November 24–25, 2026')
            ->where('summary.total_responses', 0)
            ->has('form.questions', 2));
});

test('non-admins cannot manage feedback forms', function () {
    $event = feedbackEvent();
    $participant = User::factory()->create(['participant_type' => 'participant']);

    $this->actingAs($participant)
        ->put(route('feedback-forms.update', $event), [
            'title' => 'Event Feedback',
            'questions' => [['question' => 'Q1']],
        ]);

    expect($event->feedbackForm()->exists())->toBeFalse();
});

test('editing keeps existing question ids and removes deleted questions', function () {
    $event = feedbackEvent();
    $form = createFeedbackForm($event);
    [$first, $second] = $form->questions;

    $this->actingAs(feedbackAdmin())
        ->put(route('feedback-forms.update', $event), [
            'title' => 'Updated',
            'questions' => [
                ['id' => $second->id, 'question' => 'Second, now first'],
                ['question' => 'Brand new'],
            ],
        ])
        ->assertSessionHasNoErrors();

    $questions = $form->fresh()->questions;

    expect($questions)->toHaveCount(2)
        ->and($questions[0]->id)->toBe($second->id)
        ->and($questions[0]->question)->toBe('Second, now first')
        ->and($questions[1]->question)->toBe('Brand new')
        ->and($questions->pluck('id'))->not->toContain($first->id);
});

test('the public can submit feedback with optional details and required ratings', function () {
    $form = createFeedbackForm(feedbackEvent());
    [$first, $second] = $form->questions;

    $this->get(route('event-feedback.show', $form->token))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('feedback_form')
            ->where('event.name', 'Feedback Test Event')
            ->where('form.is_open', true)
            ->has('form.questions', 2));

    $this->post(route('event-feedback.store', $form->token), [
        'name' => '  ',
        'school_agency' => 'Sample University',
        'comments' => 'Great event!',
        'ratings' => [$first->id => 5, $second->id => 3],
    ])->assertSessionHasNoErrors();

    $response = EventFeedbackResponse::query()->with('answers')->sole();

    expect($response->name)->toBeNull()
        ->and($response->school_agency)->toBe('Sample University')
        ->and($response->answers->pluck('rating', 'event_feedback_question_id')->all())
        ->toBe([$first->id => 5, $second->id => 3]);

    $this->actingAs(feedbackAdmin())
        ->get(route('feedback-forms', ['event' => 'feedback-test-event']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('summary.total_responses', 1)
            ->where('summary.overall_average', 4)
            ->where('summary.questions.0.distribution.5', 1)
            ->where('responses.data.0.comments', 'Great event!'));
});

test('every question must be rated with 1 to 5 stars', function () {
    $form = createFeedbackForm(feedbackEvent());
    [$first, $second] = $form->questions;

    $this->post(route('event-feedback.store', $form->token), [
        'ratings' => [$first->id => 6],
    ])->assertSessionHasErrors(["ratings.{$first->id}", "ratings.{$second->id}"]);

    expect(EventFeedbackResponse::query()->count())->toBe(0);
});

test('closed forms reject responses and are hidden from the events page', function () {
    $event = feedbackEvent();
    $form = createFeedbackForm($event);

    $this->get(route('events'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('events.0.feedback_url', route('event-feedback.show', $form->token)));

    $this->actingAs(feedbackAdmin())
        ->patch(route('feedback-forms.status', $event))
        ->assertRedirect();
    auth()->logout();

    expect($form->fresh()->is_open)->toBeFalse();

    $this->post(route('event-feedback.store', $form->token), [
        'ratings' => $form->questions->mapWithKeys(fn ($question) => [$question->id => 4])->all(),
    ])->assertSessionHasErrors('form');

    $this->get(route('events'))
        ->assertInertia(fn (Assert $page) => $page->where('events.0.feedback_url', null));
});

test('export returns every response with its ratings', function () {
    $event = feedbackEvent();
    $form = createFeedbackForm($event, ['Only question']);
    $question = $form->questions->first();

    foreach ([5, 2] as $rating) {
        $this->post(route('event-feedback.store', $form->token), [
            'ratings' => [$question->id => $rating],
        ])->assertSessionHasNoErrors();
    }

    $this->actingAs(feedbackAdmin())
        ->getJson(route('feedback-forms.export', $event))
        ->assertOk()
        ->assertJsonCount(1, 'questions')
        ->assertJsonCount(2, 'responses');
});

test('deleting a form removes its responses', function () {
    $event = feedbackEvent();
    $form = createFeedbackForm($event, ['Only question']);

    $this->post(route('event-feedback.store', $form->token), [
        'ratings' => [$form->questions->first()->id => 4],
    ]);

    $this->actingAs(feedbackAdmin())
        ->delete(route('feedback-forms.destroy', $event))
        ->assertRedirect();

    expect(EventFeedbackForm::query()->count())->toBe(0)
        ->and(EventFeedbackResponse::query()->count())->toBe(0);

    $this->get(route('event-feedback.show', $form->token))->assertNotFound();
});
