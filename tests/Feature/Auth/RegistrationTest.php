<?php

use App\Models\Event;
use App\Models\Municipality;
use App\Models\Province;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('welcome registration form can be rendered', function () {
    $response = $this->get(route('home'));

    $response->assertOk();
});

test('fortify registration page redirects to the public registration form', function () {
    $response = $this->get(route('register'));

    $response->assertRedirect(route('registration'));
});

test('new users can register from the welcome page', function () {
    $province = Province::query()->updateOrCreate(
        ['code' => '1001300000'],
        [
            'name' => 'Bukidnon',
            'region_code' => '1000000000',
            'region_name' => 'Region X (Northern Mindanao)',
            'is_active' => true,
        ],
    );
    $municipality = Municipality::query()->updateOrCreate(
        ['code' => '1001312000'],
        [
            'province_id' => $province->id,
            'name' => 'City of Malaybalay',
            'type' => 'City',
            'is_active' => true,
        ],
    );

    $response = $this->post(route('event-registration.store'), [
        'given_name' => 'Test',
        'middle_name' => 'Middle',
        'surname' => 'User',
        'email' => 'test+'.uniqid().'@example.com',
        'phone' => '09171234567',
        'province' => $province->code,
        'municipality' => $municipality->code,
        'organization' => 'Test University',
        'position' => 'Faculty',
        'participant_type' => 'faculty',
        'sex' => 'female',
        'event_name' => 'ched-regional-orientation',
        'consent' => 'yes',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertGuest();
    $response->assertRedirect(route('home', absolute: false));
});

test('one participant account can register for multiple events but not the same event twice', function () {
    $events = Event::query()->limit(2)->get();
    expect($events)->toHaveCount(2);

    $events->each->update([
        'starts_at' => now()->subHour(),
        'ends_at' => now()->addDay(),
        'is_active' => true,
        'is_registration_closed' => false,
    ]);

    $province = Province::query()->create([
        'name' => 'Registration Province',
        'code' => '9900000001',
        'region_code' => '9900000000',
        'region_name' => 'Test Region',
        'is_active' => true,
    ]);
    $municipality = Municipality::query()->create([
        'province_id' => $province->id,
        'name' => 'Registration City',
        'code' => '9900000002',
        'type' => 'City',
        'is_active' => true,
    ]);
    $email = 'multi-event@example.com';
    $payload = [
        'given_name' => 'Multi',
        'surname' => 'Event',
        'email' => $email,
        'phone' => '09171234567',
        'province' => $province->code,
        'municipality' => $municipality->code,
        'organization' => 'Multi Event University',
        'participant_type' => 'attendee',
        'sex' => 'female',
        'consent' => 'yes',
    ];

    $this->post(route('event-registration.store'), [
        ...$payload,
        'event_name' => $events[0]->slug,
    ])->assertRedirect();
    $participant = User::query()->where('email', $email)->firstOrFail();

    $this->post(route('event-registration.store'), [
        ...$payload,
        'event_name' => $events[1]->slug,
    ])->assertRedirect();

    expect(User::query()->where('email', $email)->count())->toBe(1)
        ->and($participant->eventRegistrations()->count())->toBe(2)
        ->and($participant->participant_id)->toBe($participant->fresh()->participant_id);

    $this->post(route('event-registration.store'), [
        ...$payload,
        'event_name' => $events[1]->slug,
    ])->assertSessionHasErrors([
        'email' => 'This account is already registered for the selected event.',
    ]);

    expect($participant->eventRegistrations()->count())->toBe(2);
});
