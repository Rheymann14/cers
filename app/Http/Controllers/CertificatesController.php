<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventAttendance;
use App\Models\EventCertificate;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CertificatesController extends Controller
{
    private const ASSET_DIRECTORY = 'certificate-assets';

    private const SORTS = ['name', 'organization', 'checked_in_at'];

    public function __invoke(Request $request): Response
    {
        $perPage = max(5, min(100, $request->integer('per_page', 10)));
        $sort = in_array($request->string('sort')->toString(), self::SORTS, true)
            ? $request->string('sort')->toString()
            : 'name';
        $direction = $request->string('direction')->toString() === 'desc' ? 'desc' : 'asc';
        $search = trim($request->string('search')->toString());

        $checkedInCounts = EventAttendance::query()
            ->selectRaw('event_id, count(distinct user_id) as checked_in_count')
            ->whereHas('participant', function (Builder $query) {
                $query->whereHas('eventRegistrations', function (Builder $query) {
                    $query->whereColumn('event_registrations.event_id', 'event_attendances.event_id');
                });
            })
            ->groupBy('event_id')
            ->pluck('checked_in_count', 'event_id');

        $events = Event::query()
            ->orderByRaw('starts_at is null')
            ->orderBy('starts_at')
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'slug',
                'venue_name',
                'venue_address',
                'starts_at',
                'ends_at',
                'is_active',
            ]);

        $selectedEvent = $events->firstWhere('slug', $request->string('event')->toString())
            ?? $this->nearestEvent($events);
        $selectedEvent?->load('certificate');

        return Inertia::render('certificates', [
            'events' => $events->map(fn (Event $event) => [
                'id' => $event->id,
                'value' => $event->slug,
                'label' => $event->name,
                'starts_at' => $event->starts_at?->toIso8601String(),
                'ends_at' => $event->ends_at?->toIso8601String(),
                'checked_in_count' => (int) ($checkedInCounts[$event->id] ?? 0),
            ])->values(),
            'selectedEvent' => $selectedEvent ? [
                'id' => $selectedEvent->id,
                'slug' => $selectedEvent->slug,
                'name' => $selectedEvent->name,
                'venue_name' => $selectedEvent->venue_name,
                'venue_address' => $selectedEvent->venue_address,
                'starts_at' => $selectedEvent->starts_at?->toIso8601String(),
                'ends_at' => $selectedEvent->ends_at?->toIso8601String(),
            ] : null,
            'certificate' => $selectedEvent ? EventCertificate::templateFor($selectedEvent) : null,
            'participants' => $selectedEvent
                ? $this->recipientQuery($selectedEvent, $search, $sort, $direction)
                    ->paginate($perPage)
                    ->withQueryString()
                    ->through(fn (User $user) => $this->recipientData($user))
                : null,
            'filters' => [
                'search' => $search,
                'event' => $selectedEvent?->slug,
                'sort' => $sort,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
            'timezone' => config('app.attendance_timezone', 'Asia/Manila'),
        ]);
    }

    /**
     * Every checked-in participant to print, optionally narrowed by search or selected IDs.
     */
    public function recipients(Request $request, Event $event): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'ids' => ['nullable', 'array', 'max:2000'],
            'ids.*' => ['integer'],
        ]);

        $recipients = $this->recipientQuery($event, trim($validated['search'] ?? ''), 'name', 'asc')
            ->when(
                ! empty($validated['ids']),
                fn (Builder $query) => $query->whereIn('users.id', $validated['ids']),
            )
            ->get()
            ->map(fn (User $user) => $this->recipientData($user))
            ->values();

        return response()->json($recipients);
    }

    public function update(Request $request, Event $event): RedirectResponse
    {
        $imageRule = ['nullable', 'file', 'mimes:png,jpg,jpeg,webp'];
        $contentRules = fn (string $type) => [
            $type => ['required', 'array'],
            "{$type}.title" => ['required', 'string', 'max:150'],
            "{$type}.intro" => ['nullable', 'string', 'max:255'],
            "{$type}.body" => ['nullable', 'string', 'max:1500'],
            "{$type}.footer" => ['nullable', 'string', 'max:500'],
            "{$type}.vertical_offset" => ['nullable', 'integer', 'between:-20,20'],
        ];

        $validated = $request->validate([
            'logo' => [...$imageRule, 'max:5120'],
            'remove_logo' => ['nullable', 'boolean'],
            'appearance_background' => [...$imageRule, 'max:10240'],
            'remove_appearance_background' => ['nullable', 'boolean'],
            'participation_background' => [...$imageRule, 'max:10240'],
            'remove_participation_background' => ['nullable', 'boolean'],
            ...$contentRules('appearance'),
            ...$contentRules('participation'),
            'signatories' => ['nullable', 'array', 'max:'.EventCertificate::MAX_SIGNATORIES],
            'signatories.*.name' => ['required', 'string', 'max:150'],
            'signatories.*.position' => ['nullable', 'string', 'max:150'],
            'signatories.*.signature' => [...$imageRule, 'max:2048'],
            'signatories.*.signature_path' => ['nullable', 'string', 'max:255'],
        ], [
            'signatories.*.name.required' => 'Each signatory needs a name.',
        ]);

        $certificate = $event->certificate()->firstOrNew();
        $updates = [];

        foreach (['logo', 'appearance_background', 'participation_background'] as $field) {
            $column = "{$field}_path";

            if ($request->hasFile($field)) {
                $this->deleteStoredFile($certificate->{$column});
                $updates[$column] = $request->file($field)->store(self::ASSET_DIRECTORY);
            } elseif ($request->boolean("remove_{$field}")) {
                $this->deleteStoredFile($certificate->{$column});
                $updates[$column] = null;
            }
        }

        foreach (EventCertificate::TYPES as $type) {
            $updates["{$type}_content"] = [
                'title' => $validated[$type]['title'],
                'intro' => $validated[$type]['intro'] ?? '',
                'body' => $validated[$type]['body'] ?? '',
                'footer' => $validated[$type]['footer'] ?? '',
                'vertical_offset' => (int) ($validated[$type]['vertical_offset'] ?? 0),
            ];
        }

        $previousSignaturePaths = collect($certificate->signatories ?? [])
            ->pluck('signature_path')
            ->filter()
            ->values();
        $signatories = collect($validated['signatories'] ?? [])
            ->values()
            ->map(function (array $signatory, int $index) use ($request, $previousSignaturePaths) {
                $existingPath = $signatory['signature_path'] ?? null;

                return [
                    'name' => $signatory['name'],
                    'position' => $signatory['position'] ?? '',
                    'signature_path' => $request->hasFile("signatories.{$index}.signature")
                        ? $request->file("signatories.{$index}.signature")->store(self::ASSET_DIRECTORY)
                        // Only keep paths this certificate already owns.
                        : ($previousSignaturePaths->contains($existingPath) ? $existingPath : null),
                ];
            });

        $previousSignaturePaths
            ->diff($signatories->pluck('signature_path')->filter())
            ->each(fn (string $path) => $this->deleteStoredFile($path));

        $certificate->fill([
            ...$updates,
            'signatories' => $signatories->all(),
            'updated_by_user_id' => $request->user()?->id,
        ])->save();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Certificate settings saved.',
        ]);

        return back();
    }

    public function asset(string $path): StreamedResponse
    {
        abort_if(
            str_contains($path, '..') || ! Str::startsWith($path, self::ASSET_DIRECTORY.'/'),
            404,
        );

        $disk = Storage::disk();

        abort_unless($disk->exists($path), 404);

        return $disk->response($path, headers: [
            'Cache-Control' => 'private, max-age=604800, immutable',
        ]);
    }

    private function recipientQuery(Event $event, string $search, string $sort, string $direction): Builder
    {
        $attendances = fn ($query) => $query->where('event_id', $event->id);

        return User::query()
            ->join('event_registrations', function ($join) use ($event) {
                $join->on('event_registrations.user_id', '=', 'users.id')
                    ->where('event_registrations.event_id', '=', $event->id);
            })
            ->whereHas('attendances', $attendances)
            ->select([
                'users.id',
                'users.participant_id',
                'users.name',
                'users.email',
                'users.avatar',
                'users.organization as user_organization',
                'users.position as user_position',
                'event_registrations.organization as registration_organization',
                'event_registrations.position as registration_position',
                'event_registrations.participant_type as registration_participant_type',
            ])
            ->withCount(['attendances as days_attended' => $attendances])
            ->withMin(['attendances as first_checked_in_at' => $attendances], 'checked_in_at')
            ->when($search !== '', function (Builder $query) use ($search) {
                $like = '%'.$search.'%';

                $query->where(fn (Builder $query) => $query
                    ->where('users.name', 'like', $like)
                    ->orWhere('users.participant_id', 'like', $like)
                    ->orWhere('users.email', 'like', $like)
                    ->orWhere('event_registrations.organization', 'like', $like)
                    ->orWhere('users.organization', 'like', $like));
            })
            ->when(
                $sort === 'organization',
                fn (Builder $query) => $query->orderByRaw(
                    'coalesce(event_registrations.organization, users.organization) '.$direction,
                ),
            )
            ->when($sort === 'checked_in_at', fn (Builder $query) => $query->orderBy('first_checked_in_at', $direction))
            ->orderBy('users.name', $sort === 'name' ? $direction : 'asc')
            ->orderBy('users.id');
    }

    /**
     * @return array<string, mixed>
     */
    private function recipientData(User $user): array
    {
        return [
            'id' => $user->id,
            'participant_id' => $user->participant_id,
            'name' => $user->name,
            'email' => $user->email,
            'avatar' => $user->avatar,
            'organization' => $user->registration_organization ?: $user->user_organization,
            'position' => $user->registration_position ?: $user->user_position,
            'participant_type' => $user->registration_participant_type,
            'days_attended' => (int) $user->days_attended,
            'first_checked_in_at' => $user->first_checked_in_at
                ? Carbon::parse($user->first_checked_in_at)->toIso8601String()
                : null,
        ];
    }

    /**
     * Pick the ongoing event, or the one starting or ending closest to now.
     *
     * @param  Collection<int, Event>  $events
     */
    private function nearestEvent(Collection $events): ?Event
    {
        $now = now();

        return $events
            ->sortBy(function (Event $event) use ($now) {
                $startsAt = $event->starts_at;
                $endsAt = $event->ends_at;

                return match (true) {
                    $startsAt && $now->lt($startsAt) => $startsAt->diffInSeconds($now, true),
                    $endsAt && $now->gt($endsAt) => $endsAt->diffInSeconds($now, true),
                    $startsAt || $endsAt => 0,
                    default => PHP_INT_MAX,
                };
            })
            ->first();
    }

    private function deleteStoredFile(?string $path): void
    {
        if ($path) {
            Storage::disk()->delete($path);
        }
    }
}
