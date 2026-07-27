<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventAttendance;
use App\Models\EventRegistration;
use App\Models\Municipality;
use App\Models\Organization;
use App\Models\ParticipantType;
use App\Models\Province;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $events = Event::query()
            ->withCount([
                'registrations as users_count' => fn ($query) => $query->whereHas('user'),
            ])
            ->orderBy('starts_at')
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'slug',
                'starts_at',
                'ends_at',
            ]);

        $checkedInByEvent = EventAttendance::query()
            ->selectRaw('event_id, count(distinct user_id) as checked_in_count')
            ->whereHas('participant', function ($query) {
                $query->whereHas('eventRegistrations', function ($query) {
                    $query->whereColumn('event_registrations.event_id', 'event_attendances.event_id');
                });
            })
            ->groupBy('event_id')
            ->pluck('checked_in_count', 'event_id');

        $checkedInByEventAndDate = EventAttendance::query()
            ->selectRaw('event_id, attendance_date, count(distinct user_id) as checked_in_count')
            ->whereHas('participant', function ($query) {
                $query->whereHas('eventRegistrations', function ($query) {
                    $query->whereColumn('event_registrations.event_id', 'event_attendances.event_id');
                });
            })
            ->groupBy('event_id', 'attendance_date')
            ->get()
            ->keyBy(fn (EventAttendance $attendance) => $attendance->event_id.':'.$attendance->attendance_date->toDateString());

        $eventDatesById = $events->mapWithKeys(fn (Event $event) => [
            $event->id => $this->eventDates($event),
        ]);

        $eventAttendanceSummary = $events->map(function (Event $event) use (
            $checkedInByEvent,
            $checkedInByEventAndDate,
            $eventDatesById,
        ) {
            $participantsCount = (int) $event->users_count;
            $checkedInCount = (int) ($checkedInByEvent[$event->id] ?? 0);
            $notCheckedInCount = max(0, $participantsCount - $checkedInCount);
            $dailyAttendance = $eventDatesById[$event->id]
                ->map(function (string $date) use (
                    $checkedInByEventAndDate,
                    $event,
                    $participantsCount,
                ) {
                    $dailyCheckedInCount = (int) (
                        $checkedInByEventAndDate[$event->id.':'.$date]?->checked_in_count ?? 0
                    );

                    return [
                        'date' => $date,
                        'participants_count' => $participantsCount,
                        'checked_in_count' => $dailyCheckedInCount,
                        'not_checked_in_count' => max(0, $participantsCount - $dailyCheckedInCount),
                        'attendance_rate' => $participantsCount > 0
                            ? round(($dailyCheckedInCount / $participantsCount) * 100, 2)
                            : 0,
                    ];
                })
                ->values();

            return [
                'id' => $event->id,
                'name' => $event->name,
                'slug' => $event->slug,
                'starts_at' => $event->starts_at ? Carbon::parse($event->starts_at)->toIso8601String() : null,
                'ends_at' => $event->ends_at ? Carbon::parse($event->ends_at)->toIso8601String() : null,
                'participants_count' => $participantsCount,
                'checked_in_count' => $checkedInCount,
                'not_checked_in_count' => $notCheckedInCount,
                'attendance_rate' => $participantsCount > 0
                    ? round(($checkedInCount / $participantsCount) * 100, 2)
                    : 0,
                'daily_attendance' => $dailyAttendance,
            ];
        })->values();

        $registeredEventParticipants = $eventAttendanceSummary->sum('participants_count');
        $checkedInParticipants = $eventAttendanceSummary->sum('checked_in_count');
        $notCheckedInParticipants = max(0, $registeredEventParticipants - $checkedInParticipants);

        $registrationTrend = collect(range(13, 0))
            ->map(function (int $daysAgo) {
                $date = Carbon::today()->subDays($daysAgo);

                return [
                    'date' => $date->toDateString(),
                    'label' => $date->format('M j'),
                    'count' => EventRegistration::query()
                        ->whereHas('user')
                        ->whereDate('created_at', $date->toDateString())
                        ->count(),
                ];
            });

        $checkedInParticipantsList = EventAttendance::query()
            ->whereHas('participant', function ($query) {
                $query->whereHas('eventRegistrations', function ($query) {
                    $query->whereColumn('event_registrations.event_id', 'event_attendances.event_id');
                });
            })
            ->with([
                'event:id,name,slug',
                'participant:id,participant_id,name,given_name,middle_name,surname,email,phone,sex,province_id,municipality_id,is_active',
                'participant.eventRegistrations',
                'participant.province:id,name',
                'participant.municipality:id,name',
                'checkedInBy:id,name',
            ])
            ->latest('checked_in_at')
            ->get()
            ->filter(fn (EventAttendance $attendance) => $attendance->participant && $attendance->event)
            ->map(function (EventAttendance $attendance) {
                $participant = $attendance->participant;
                $event = $attendance->event;
                $registration = $participant->eventRegistrations
                    ->firstWhere('event_id', $event->id);

                return [
                    'id' => $attendance->id,
                    'row_key' => 'attendance-'.$attendance->id,
                    'participant_id' => $participant->participant_id,
                    'name' => $participant->name,
                    'given_name' => $participant->given_name,
                    'middle_name' => $participant->middle_name,
                    'surname' => $participant->surname,
                    'email' => $participant->email,
                    'phone' => $participant->phone,
                    'organization' => $registration?->organization,
                    'participant_type' => $registration?->participant_type,
                    'sex' => $participant->sex,
                    'province' => $participant->province?->name,
                    'municipality' => $participant->municipality?->name,
                    'is_active' => $participant->is_active,
                    'event_name' => $event->name,
                    'event_slug' => $event->slug,
                    'registered_at' => $registration?->created_at?->toIso8601String(),
                    'attendance_date' => $attendance->attendance_date?->toDateString(),
                    'checked_in_at' => $attendance->checked_in_at?->toIso8601String(),
                    'scanned_by' => $attendance->checkedInBy?->name,
                ];
            })
            ->values();

        $checkedInKeys = EventAttendance::query()
            ->get(['event_id', 'user_id', 'attendance_date'])
            ->mapWithKeys(fn (EventAttendance $attendance) => [
                $attendance->event_id.':'.$attendance->user_id.':'.$attendance->attendance_date->toDateString() => true,
            ]);
        $notCheckedInParticipantsList = EventRegistration::query()
            ->whereHas('user')
            ->with([
                'event:id,name,slug',
                'user:id,participant_id,name,given_name,middle_name,surname,email,phone,sex,province_id,municipality_id,is_active',
                'user.province:id,name',
                'user.municipality:id,name',
            ])
            ->latest()
            ->get()
            ->flatMap(function (EventRegistration $registration) use (
                $checkedInKeys,
                $eventDatesById,
            ) {
                $participant = $registration->user;
                $event = $registration->event;

                return ($eventDatesById[$registration->event_id] ?? collect())
                    ->reject(fn (string $date) => $checkedInKeys->has(
                        $registration->event_id.':'.$registration->user_id.':'.$date,
                    ))
                    ->map(fn (string $date) => [
                        'id' => $registration->id,
                        'row_key' => 'registration-'.$registration->id.'-'.$date,
                        'participant_id' => $participant->participant_id,
                        'name' => $participant->name,
                        'given_name' => $participant->given_name,
                        'middle_name' => $participant->middle_name,
                        'surname' => $participant->surname,
                        'email' => $participant->email,
                        'phone' => $participant->phone,
                        'organization' => $registration->organization,
                        'participant_type' => $registration->participant_type,
                        'sex' => $participant->sex,
                        'province' => $participant->province?->name,
                        'municipality' => $participant->municipality?->name,
                        'is_active' => $participant->is_active,
                        'event_name' => $event?->name,
                        'event_slug' => $event?->slug,
                        'registered_at' => $registration->created_at?->toIso8601String(),
                        'attendance_date' => $date,
                        'checked_in_at' => null,
                        'scanned_by' => null,
                    ]);
            })
            ->values();

        return Inertia::render('dashboard', [
            'stats' => [
                'participants' => $registeredEventParticipants,
                'checkedInParticipants' => $checkedInParticipants,
                'notCheckedInParticipants' => $notCheckedInParticipants,
            ],
            'recentParticipants' => EventRegistration::query()
                ->whereHas('user')
                ->with(['user:id,participant_id,name,email', 'event:id,name,slug'])
                ->latest()
                ->get()
                ->map(fn (EventRegistration $registration) => [
                    'id' => $registration->id,
                    'participant_id' => $registration->user?->participant_id,
                    'name' => $registration->user?->name,
                    'email' => $registration->user?->email,
                    'organization' => $registration->organization,
                    'participant_type' => $registration->participant_type,
                    'event_name' => $registration->event?->slug,
                    'created_at' => $registration->created_at,
                ]),
            'eventSummary' => EventRegistration::query()
                ->whereHas('user')
                ->join('events', 'events.id', '=', 'event_registrations.event_id')
                ->selectRaw('events.slug as event_name, count(*) as participants_count')
                ->groupBy('events.slug')
                ->orderByDesc('participants_count')
                ->get(),
            'registrationTrend' => $registrationTrend,
            'attendanceStatus' => [
                [
                    'label' => 'Checked In',
                    'count' => $checkedInParticipants,
                ],
                [
                    'label' => 'Not Checked In',
                    'count' => $notCheckedInParticipants,
                ],
            ],
            'eventAttendanceSummary' => $eventAttendanceSummary,
            'checkedInParticipants' => $checkedInParticipantsList,
            'notCheckedInParticipants' => $notCheckedInParticipantsList,
            'participantStatistics' => [
                'participants' => EventRegistration::query()
                    ->join('users', 'users.id', '=', 'event_registrations.user_id')
                    ->join('events', 'events.id', '=', 'event_registrations.event_id')
                    ->whereNull('users.deleted_at')
                    ->get([
                        'event_registrations.id',
                        'users.province_id',
                        'users.municipality_id',
                        'users.sex',
                        'event_registrations.participant_type',
                        'event_registrations.organization_id',
                        'event_registrations.organization',
                        'events.slug as event_name',
                    ]),
                'provinces' => Province::query()
                    ->select(['id', 'name', 'code'])
                    ->withCount('users')
                    ->orderBy('name')
                    ->get(),
                'municipalities' => Municipality::query()
                    ->select(['id', 'province_id', 'name', 'code', 'type'])
                    ->withCount('users')
                    ->orderBy('name')
                    ->get(),
                'participantTypes' => ParticipantType::query()
                    ->join('events', 'events.id', '=', 'participant_types.event_id')
                    ->select([
                        'participant_types.id',
                        'participant_types.name',
                        'participant_types.slug',
                        'participant_types.type',
                        'events.slug as event_slug',
                    ])
                    ->withCount([
                        'registrations' => fn ($query) => $query->whereHas('user'),
                    ])
                    ->orderBy('participant_types.name')
                    ->get(),
                'organizations' => Organization::query()
                    ->select(['id', 'name', 'slug', 'type'])
                    ->withCount([
                        'registrations' => fn ($query) => $query->whereHas('user'),
                    ])
                    ->orderBy('name')
                    ->get(),
            ],
        ]);
    }

    /**
     * @return Collection<int, string>
     */
    private function eventDates(Event $event): Collection
    {
        $attendanceTimezone = config('app.attendance_timezone', 'Asia/Manila');
        $startsOn = $event->starts_at?->copy()
            ->timezone($attendanceTimezone)
            ->startOfDay();
        $endsOn = ($event->ends_at ?? $event->starts_at)?->copy()
            ->timezone($attendanceTimezone)
            ->startOfDay();

        if (! $startsOn || ! $endsOn) {
            return collect();
        }

        $dates = collect();

        for ($date = $startsOn->copy(); $date->lte($endsOn); $date = $date->addDay()) {
            $dates->push($date->toDateString());
        }

        return $dates;
    }
}
