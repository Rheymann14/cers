<?php

test('welcome registration form can be rendered', function () {
    $response = $this->get(route('home'));

    $response->assertOk();
});

test('new users can register from the welcome page', function () {
    $response = $this->post(route('event-registration.store'), [
        'given_name' => 'Test',
        'middle_name' => 'Middle',
        'surname' => 'User',
        'email' => 'test+'.uniqid().'@example.com',
        'phone' => '0917 123 4567',
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
    $response->assertRedirect(route('dashboard', absolute: false));
});
