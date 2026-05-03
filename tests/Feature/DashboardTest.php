<?php

use App\Models\User;

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
