<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventAttendance;
use App\Models\Municipality;
use App\Models\Organization;
use App\Models\ParticipantType;
use App\Models\Province;
use App\Models\User;
use Carbon\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $events = Event::query()
            ->withCount('users')
            ->orderBy('starts_at')
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'slug',
                'starts_at',
                'ends_at',
            ]);

        $eventsById = $events->keyBy('id');

        $checkedInByEvent = EventAttendance::query()
            ->selectRaw('event_id, count(distinct user_id) as checked_in_count')
            ->whereHas('participant', function ($query) {
                $query->whereColumn('users.event_id', 'event_attendances.event_id');
            })
            ->groupBy('event_id')
            ->pluck('checked_in_count', 'event_id');

        $eventAttendanceSummary = $events->map(function (Event $event) use ($checkedInByEvent) {
            $participantsCount = (int) $event->users_count;
            $checkedInCount = (int) ($checkedInByEvent[$event->id] ?? 0);
            $notCheckedInCount = max(0, $participantsCount - $checkedInCount);

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
                    'count' => User::query()
                        ->whereDate('created_at', $date->toDateString())
                        ->count(),
                ];
            });

        $checkedInParticipantsList = EventAttendance::query()
            ->whereHas('participant', function ($query) {
                $query->whereColumn('users.event_id', 'event_attendances.event_id');
            })
            ->with([
                'event:id,name,slug',
                'participant:id,participant_id,name,given_name,middle_name,surname,email,phone,organization,participant_type,sex,event_id,event_name,province_id,municipality_id,is_active,created_at',
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

                return [
                    'id' => $attendance->id,
                    'participant_id' => $participant->participant_id,
                    'name' => $participant->name,
                    'given_name' => $participant->given_name,
                    'middle_name' => $participant->middle_name,
                    'surname' => $participant->surname,
                    'email' => $participant->email,
                    'phone' => $participant->phone,
                    'organization' => $participant->organization,
                    'participant_type' => $participant->participant_type,
                    'sex' => $participant->sex,
                    'province' => $participant->province?->name,
                    'municipality' => $participant->municipality?->name,
                    'is_active' => $participant->is_active,
                    'event_name' => $event->name,
                    'event_slug' => $event->slug,
                    'registered_at' => $participant->created_at?->toIso8601String(),
                    'checked_in_at' => $attendance->checked_in_at?->toIso8601String(),
                    'scanned_by' => $attendance->checkedInBy?->name,
                ];
            })
            ->values();

        $notCheckedInParticipantsList = User::query()
            ->with(['province:id,name', 'municipality:id,name'])
            ->whereNotNull('event_id')
            ->whereDoesntHave('attendances', function ($query) {
                $query->whereColumn('event_attendances.event_id', 'users.event_id');
            })
            ->latest()
            ->get([
                'id',
                'participant_id',
                'name',
                'given_name',
                'middle_name',
                'surname',
                'email',
                'phone',
                'organization',
                'participant_type',
                'sex',
                'event_id',
                'event_name',
                'province_id',
                'municipality_id',
                'is_active',
                'created_at',
            ])
            ->map(function (User $participant) use ($eventsById) {
                $event = $eventsById->get($participant->event_id);

                return [
                    'id' => $participant->id,
                    'participant_id' => $participant->participant_id,
                    'name' => $participant->name,
                    'given_name' => $participant->given_name,
                    'middle_name' => $participant->middle_name,
                    'surname' => $participant->surname,
                    'email' => $participant->email,
                    'phone' => $participant->phone,
                    'organization' => $participant->organization,
                    'participant_type' => $participant->participant_type,
                    'sex' => $participant->sex,
                    'province' => $participant->province?->name,
                    'municipality' => $participant->municipality?->name,
                    'is_active' => $participant->is_active,
                    'event_name' => $event?->name ?? $participant->event_name,
                    'event_slug' => $event?->slug ?? $participant->event_name,
                    'registered_at' => $participant->created_at?->toIso8601String(),
                    'checked_in_at' => null,
                    'scanned_by' => null,
                ];
            })
            ->values();

        return Inertia::render('dashboard', [
            'stats' => [
                'participants' => $registeredEventParticipants,
                'checkedInParticipants' => $checkedInParticipants,
                'notCheckedInParticipants' => $notCheckedInParticipants,
            ],
            'recentParticipants' => User::query()
                ->whereNotNull('event_name')
                ->latest()
                ->get([
                    'id',
                    'participant_id',
                    'name',
                    'email',
                    'organization',
                    'participant_type',
                    'event_name',
                    'created_at',
                ]),
            'eventSummary' => User::query()
                ->selectRaw('event_name, count(*) as participants_count')
                ->whereNotNull('event_name')
                ->groupBy('event_name')
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
                'participants' => User::query()
                    ->get([
                        'id',
                        'province_id',
                        'municipality_id',
                        'sex',
                        'participant_type',
                        'organization_id',
                        'organization',
                        'event_name',
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
                    ->select(['id', 'name', 'slug', 'type'])
                    ->withCount('users')
                    ->orderBy('name')
                    ->get(),
                'organizations' => Organization::query()
                    ->select(['id', 'name', 'slug', 'type'])
                    ->withCount('users')
                    ->orderBy('name')
                    ->get(),
            ],
        ]);
    }
}
