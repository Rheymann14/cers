<?php

use App\Models\Event;
use App\Models\EventAttendance;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('administrator users can visit the dashboard', function () {
    $user = User::factory()->create([
        'participant_type' => 'admin',
    ]);
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('dashboard attendance totals use event registered participants', function () {
    $admin = User::factory()->create([
        'participant_type' => 'admin',
    ]);
    $event = Event::query()->create([
        'name' => 'Dashboard Count Test',
        'slug' => 'dashboard-count-test',
        'is_active' => true,
        'starts_at' => now()->startOfDay(),
        'ends_at' => now()->addDay()->midDay(),
    ]);
    $checkedInParticipant = User::factory()->create([
        'participant_type' => 'participant',
    ]);
    EventRegistration::query()->create([
        'user_id' => $checkedInParticipant->id,
        'event_id' => $event->id,
        'participant_type' => 'participant',
    ]);

    $participants = User::factory()
        ->count(6)
        ->create(['participant_type' => 'participant']);
    $participants->each(fn (User $participant) => EventRegistration::query()->create([
        'user_id' => $participant->id,
        'event_id' => $event->id,
        'participant_type' => 'participant',
    ]));
    User::factory()->count(3)->create([
        'participant_type' => 'participant',
    ]);

    EventAttendance::query()->create([
        'event_id' => $event->id,
        'user_id' => $checkedInParticipant->id,
        'attendance_date' => now()->toDateString(),
        'checked_in_by_user_id' => $admin->id,
        'checked_in_at' => now(),
    ]);
    EventAttendance::query()->create([
        'event_id' => $event->id,
        'user_id' => $checkedInParticipant->id,
        'attendance_date' => now()->addDay()->toDateString(),
        'checked_in_by_user_id' => $admin->id,
        'checked_in_at' => now()->addDay(),
    ]);

    $this->actingAs($admin);

    $response = $this->get(route('dashboard'));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('stats.participants', 7)
            ->where('stats.checkedInParticipants', 1)
            ->where('stats.notCheckedInParticipants', 6)
            ->where('attendanceStatus.0.count', 1)
            ->where('attendanceStatus.1.count', 6)
            ->where(
                'eventAttendanceSummary',
                function ($summaries) use ($event) {
                    $dailyAttendance = collect($summaries)
                        ->firstWhere('id', $event->id)['daily_attendance'] ?? [];

                    return count($dailyAttendance) === 2
                        && $dailyAttendance[0]['checked_in_count'] === 1
                        && $dailyAttendance[1]['checked_in_count'] === 1;
                },
            )
            ->loadDeferredProps('attendance', fn (Assert $page) => $page
                ->has('checkedInParticipants', 2)
                ->has('notCheckedInParticipants', 12)
                ->where(
                    'checkedInParticipants.0.attendance_date',
                    now()->addDay()->toDateString(),
                )
                ->where(
                    'checkedInParticipants.1.attendance_date',
                    now()->toDateString(),
                ))
        );
});

test('dashboard ignores registrations belonging to deleted participants', function () {
    $admin = User::factory()->create([
        'participant_type' => 'admin',
    ]);
    $event = Event::query()->create([
        'name' => 'Deleted Participant Test',
        'slug' => 'deleted-participant-test',
        'is_active' => true,
    ]);
    $participant = User::factory()->create([
        'participant_type' => 'participant',
    ]);

    EventRegistration::query()->create([
        'user_id' => $participant->id,
        'event_id' => $event->id,
        'participant_type' => 'participant',
    ]);

    $participant->delete();

    $this->actingAs($admin)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('stats.participants', 0)
            ->where('stats.notCheckedInParticipants', 0)
            ->where('eventAttendanceSummary.0.participants_count', 0)
            ->loadDeferredProps(
                ['dashboard-secondary', 'attendance'],
                fn (Assert $page) => $page
                    ->has('recentParticipants', 0)
                    ->has('notCheckedInParticipants', 0),
            )
        );
});

test('dashboard treats a UTC-spanning Philippine event as one local attendance day', function () {
    $admin = User::factory()->create([
        'participant_type' => 'admin',
    ]);
    $participant = User::factory()->create([
        'participant_type' => 'participant',
    ]);
    $event = Event::query()->create([
        'name' => 'PBBM Gabay Date Test',
        'slug' => 'pbbm-gabay-date-test',
        'is_active' => true,
        'starts_at' => '2026-05-12 23:30:00',
        'ends_at' => '2026-05-13 06:00:00',
    ]);

    EventRegistration::query()->create([
        'user_id' => $participant->id,
        'event_id' => $event->id,
        'participant_type' => 'participant',
    ]);
    EventAttendance::query()->create([
        'event_id' => $event->id,
        'user_id' => $participant->id,
        'attendance_date' => '2026-05-13',
        'checked_in_by_user_id' => $admin->id,
        'checked_in_at' => '2026-05-12 23:45:00',
    ]);

    $this->actingAs($admin)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where(
                'eventAttendanceSummary',
                function ($summaries) use ($event) {
                    $dailyAttendance = collect($summaries)
                        ->firstWhere('id', $event->id)['daily_attendance'] ?? [];

                    return count($dailyAttendance) === 1
                        && $dailyAttendance[0]['date'] === '2026-05-13'
                        && $dailyAttendance[0]['checked_in_count'] === 1;
                },
            )
        );
});

test('non administrator users are redirected away from the dashboard', function () {
    $user = User::factory()->create([
        'participant_type' => 'participant',
    ]);
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('participant-profile.edit'));
});

test('non administrator users are redirected away from participants management', function () {
    $user = User::factory()->create([
        'participant_type' => 'participant',
    ]);
    $this->actingAs($user);

    $response = $this->get(route('participants'));
    $response->assertRedirect(route('participant-profile.edit'));
});
