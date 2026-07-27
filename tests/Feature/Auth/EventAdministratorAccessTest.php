<?php

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('an administrator registration for any event grants system access', function () {
    $event = Event::query()->create([
        'name' => 'Administrator Access Event',
        'slug' => 'administrator-access-event',
        'is_active' => true,
    ]);
    $user = User::factory()->create([
        'participant_type' => 'participant',
        'is_active' => true,
    ]);

    EventRegistration::query()->create([
        'user_id' => $user->id,
        'event_id' => $event->id,
        'participant_type' => 'admin',
    ]);

    expect($user->isAdministrator())->toBeTrue();

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ])->assertRedirect(route('dashboard', absolute: false));

    $this->assertAuthenticatedAs($user);
});

test('administrator choices and default participant types are scoped per event', function () {
    $eventOne = Event::query()->create([
        'name' => 'Event One',
        'slug' => 'event-one-admin-scope',
        'is_active' => true,
    ]);
    $eventTwo = Event::query()->create([
        'name' => 'Event Two',
        'slug' => 'event-two-admin-scope',
        'is_active' => true,
    ]);
    $eventOneAdmin = User::factory()->create([
        'name' => 'Event One Admin',
        'participant_type' => 'participant',
        'is_active' => true,
    ]);
    $eventTwoAdmin = User::factory()->create([
        'name' => 'Event Two Admin',
        'participant_type' => 'participant',
        'is_active' => true,
    ]);

    EventRegistration::query()->create([
        'user_id' => $eventOneAdmin->id,
        'event_id' => $eventOne->id,
        'participant_type' => 'admin',
    ]);
    EventRegistration::query()->create([
        'user_id' => $eventTwoAdmin->id,
        'event_id' => $eventTwo->id,
        'participant_type' => 'admin',
    ]);

    expect($eventOne->participantTypes()->where('slug', 'admin')->exists())->toBeTrue()
        ->and($eventTwo->participantTypes()->where('slug', 'admin')->exists())->toBeTrue();

    $this->actingAs($eventOneAdmin)
        ->get(route('participants'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('participants')
            ->where('addedByOptions.1.value', 'admin:'.$eventOneAdmin->id)
            ->where('addedByOptions.1.event_slug', $eventOne->slug)
            ->where('addedByOptions.2.value', 'admin:'.$eventTwoAdmin->id)
            ->where('addedByOptions.2.event_slug', $eventTwo->slug));

    $this->get(route('welcome.lookups'))
        ->assertOk()
        ->assertJsonMissing(['value' => 'admin'])
        ->assertJsonMissing(['value' => 'administrator']);
});
