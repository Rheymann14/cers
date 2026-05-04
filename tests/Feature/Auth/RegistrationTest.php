<?php

use App\Models\Municipality;
use App\Models\Province;

test('welcome registration form can be rendered', function () {
    $response = $this->get(route('home'));

    $response->assertOk();
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

    $this->assertAuthenticated();
    $response->assertRedirect(route('participant-profile.edit', absolute: false));
});
