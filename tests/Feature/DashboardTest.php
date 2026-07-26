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
        'checked_in_by_user_id' => $admin->id,
        'checked_in_at' => now(),
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
            ->has('checkedInParticipants', 1)
            ->has('notCheckedInParticipants', 6)
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
