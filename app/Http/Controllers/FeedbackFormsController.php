<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\PicksNearestEvent;
use App\Models\Event;
use App\Models\EventFeedbackAnswer;
use App\Models\EventFeedbackForm;
use App\Models\EventFeedbackQuestion;
use App\Models\EventFeedbackResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class FeedbackFormsController extends Controller
{
    use PicksNearestEvent;

    public function __invoke(Request $request): Response
    {
        $perPage = max(5, min(100, $request->integer('per_page', 10)));
        $search = trim($request->string('search')->toString());

        $forms = EventFeedbackForm::query()
            ->withCount('responses')
            ->get(['id', 'event_id', 'is_open'])
            ->keyBy('event_id');

        $events = Event::query()
            ->orderByRaw('starts_at is null')
            ->orderBy('starts_at')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'venue_name', 'venue_address', 'starts_at', 'ends_at']);

        $selectedEvent = $events->firstWhere('slug', $request->string('event')->toString())
            ?? $this->nearestEvent($events);
        $form = $selectedEvent?->feedbackForm()->with('questions')->withCount('responses')->first();

        return Inertia::render('feedback_forms', [
            'events' => $events->map(fn (Event $event) => [
                'id' => $event->id,
                'value' => $event->slug,
                'label' => $event->name,
                'starts_at' => $event->starts_at?->toIso8601String(),
                'ends_at' => $event->ends_at?->toIso8601String(),
                'has_form' => $forms->has($event->id),
                'is_open' => (bool) $forms->get($event->id)?->is_open,
                'response_count' => (int) ($forms->get($event->id)?->responses_count ?? 0),
            ])->values(),
            'selectedEvent' => $selectedEvent ? [
                'id' => $selectedEvent->id,
                'slug' => $selectedEvent->slug,
                'name' => $selectedEvent->name,
                'venue_name' => $selectedEvent->venue_name,
                'venue_address' => $selectedEvent->venue_address,
                'starts_at' => $selectedEvent->starts_at?->toIso8601String(),
                'ends_at' => $selectedEvent->ends_at?->toIso8601String(),
                'date_label' => $selectedEvent->dateLabel(),
            ] : null,
            'form' => $form ? $this->formData($form) : null,
            'defaultQuestions' => EventFeedbackForm::DEFAULT_QUESTIONS,
            'maxQuestions' => EventFeedbackForm::MAX_QUESTIONS,
            'summary' => $form ? $this->summary($form) : null,
            'responses' => $form
                ? $this->responseQuery($form, $search)
                    ->paginate($perPage)
                    ->withQueryString()
                    ->through(fn (EventFeedbackResponse $response) => $this->responseData($response))
                : null,
            'filters' => [
                'search' => $search,
                'event' => $selectedEvent?->slug,
                'per_page' => $perPage,
            ],
            'timezone' => config('app.attendance_timezone', 'Asia/Manila'),
        ]);
    }

    /**
     * Create or update the event's feedback form and its questions.
     */
    public function update(Request $request, Event $event): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_open' => ['nullable', 'boolean'],
            'questions' => ['required', 'array', 'min:1', 'max:'.EventFeedbackForm::MAX_QUESTIONS],
            'questions.*.id' => ['nullable', 'integer'],
            'questions.*.question' => ['required', 'string', 'max:500'],
        ], [
            'questions.required' => 'Add at least one question.',
            'questions.min' => 'Add at least one question.',
            'questions.max' => 'A feedback form can have up to '.EventFeedbackForm::MAX_QUESTIONS.' questions.',
            'questions.*.question.required' => 'Each question needs text.',
        ]);

        $created = false;

        DB::transaction(function () use ($request, $event, $validated, &$created) {
            $form = $event->feedbackForm()->firstOrNew();
            $created = ! $form->exists;

            $form->fill([
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'updated_by_user_id' => $request->user()?->id,
            ]);

            if ($created) {
                $form->fill([
                    'token' => EventFeedbackForm::newToken(),
                    'is_open' => $request->boolean('is_open', true),
                    'created_by_user_id' => $request->user()?->id,
                ]);
            }

            $form->save();

            $existingIds = $form->questions()->pluck('id');
            $keptIds = collect();

            foreach (array_values($validated['questions']) as $position => $question) {
                $id = isset($question['id']) ? (int) $question['id'] : null;
                $attributes = ['question' => trim($question['question']), 'position' => $position];

                if ($id && $existingIds->contains($id)) {
                    EventFeedbackQuestion::query()->whereKey($id)->update($attributes);
                    $keptIds->push($id);
                } else {
                    $form->questions()->create($attributes);
                }
            }

            // Removing a question also removes its ratings (cascade).
            $form->questions()->whereNotIn('id', $keptIds)->whereIn('id', $existingIds)->delete();
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $created ? 'Feedback form created.' : 'Feedback form saved.',
        ]);

        return back();
    }

    public function toggleStatus(Event $event): RedirectResponse
    {
        $form = $event->feedbackForm()->firstOrFail();
        $form->update(['is_open' => ! $form->is_open]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $form->is_open
                ? 'Feedback is now open for responses.'
                : 'Feedback responses are now closed.',
        ]);

        return back();
    }

    public function destroy(Event $event): RedirectResponse
    {
        $event->feedbackForm()->firstOrFail()->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Feedback form and its responses were deleted.',
        ]);

        return back();
    }

    public function destroyResponse(EventFeedbackResponse $response): RedirectResponse
    {
        $response->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Feedback response deleted.',
        ]);

        return back();
    }

    /**
     * Every response of the event's form, for the Excel export.
     */
    public function export(Event $event): JsonResponse
    {
        $form = $event->feedbackForm()->with('questions')->firstOrFail();

        return response()->json([
            'questions' => $form->questions
                ->map(fn (EventFeedbackQuestion $question) => [
                    'id' => $question->id,
                    'question' => $question->question,
                ])
                ->values(),
            'responses' => $this->responseQuery($form, '')
                ->get()
                ->map(fn (EventFeedbackResponse $response) => $this->responseData($response))
                ->values(),
        ]);
    }

    private function responseQuery(EventFeedbackForm $form, string $search): Builder
    {
        return EventFeedbackResponse::query()
            ->where('event_feedback_form_id', $form->id)
            ->with('answers:id,event_feedback_response_id,event_feedback_question_id,rating')
            ->withAvg('answers as average_rating', 'rating')
            ->when($search !== '', function (Builder $query) use ($search) {
                $like = '%'.$search.'%';

                $query->where(fn (Builder $query) => $query
                    ->where('name', 'like', $like)
                    ->orWhere('school_agency', 'like', $like)
                    ->orWhere('comments', 'like', $like));
            })
            ->latest()
            ->orderByDesc('id');
    }

    /**
     * @return array<string, mixed>
     */
    private function formData(EventFeedbackForm $form): array
    {
        return [
            'id' => $form->id,
            'token' => $form->token,
            'url' => $form->publicUrl(),
            'title' => $form->title,
            'description' => $form->description,
            'is_open' => $form->is_open,
            'response_count' => (int) $form->responses_count,
            'questions' => $form->questions
                ->map(fn (EventFeedbackQuestion $question) => [
                    'id' => $question->id,
                    'question' => $question->question,
                ])
                ->values(),
            'created_at' => $form->created_at?->toIso8601String(),
            'updated_at' => $form->updated_at?->toIso8601String(),
        ];
    }

    /**
     * Per-question average and 1-5 star distribution.
     *
     * @return array<string, mixed>
     */
    private function summary(EventFeedbackForm $form): array
    {
        /** @var Collection<int, Collection<int, object>> $counts */
        $counts = EventFeedbackAnswer::query()
            ->whereIn('event_feedback_question_id', $form->questions->pluck('id'))
            ->selectRaw('event_feedback_question_id, rating, count(*) as total')
            ->groupBy('event_feedback_question_id', 'rating')
            ->toBase()
            ->get()
            ->groupBy('event_feedback_question_id');

        $questions = $form->questions->map(function (EventFeedbackQuestion $question) use ($counts) {
            $distribution = array_fill_keys([1, 2, 3, 4, 5], 0);

            foreach ($counts->get($question->id, collect()) as $row) {
                $distribution[(int) $row->rating] = (int) $row->total;
            }

            $total = array_sum($distribution);
            $sum = collect($distribution)->map(fn (int $count, int $rating) => $count * $rating)->sum();

            return [
                'id' => $question->id,
                'question' => $question->question,
                'count' => $total,
                'average' => $total > 0 ? round($sum / $total, 2) : null,
                'distribution' => $distribution,
            ];
        })->values();

        $ratingCount = $questions->sum('count');
        $ratingSum = $questions->sum(fn (array $question) => ($question['average'] ?? 0) * $question['count']);

        return [
            'total_responses' => (int) $form->responses_count,
            'overall_average' => $ratingCount > 0 ? round($ratingSum / $ratingCount, 2) : null,
            'latest_response_at' => $form->responses()
                ->latest()
                ->first(['created_at'])
                ?->created_at
                ?->toIso8601String(),
            'questions' => $questions,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function responseData(EventFeedbackResponse $response): array
    {
        return [
            'id' => $response->id,
            'name' => $response->name,
            'school_agency' => $response->school_agency,
            'comments' => $response->comments,
            'average_rating' => $response->average_rating !== null
                ? round((float) $response->average_rating, 2)
                : null,
            'ratings' => $response->answers
                ->mapWithKeys(fn (EventFeedbackAnswer $answer) => [
                    $answer->event_feedback_question_id => $answer->rating,
                ]),
            'submitted_at' => $response->created_at?->toIso8601String(),
        ];
    }
}
