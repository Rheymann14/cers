<?php

use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('a Google Maps link can be used without coordinates', function () {
    $admin = User::factory()->create([
        'participant_type' => 'admin',
        'organization' => 'Commission on Higher Education',
    ]);
    $event = Event::query()->create([
        'name' => 'Venue Test Event',
        'slug' => 'venue-test-event',
        'is_active' => true,
    ]);
    $mapLink = 'https://www.google.com/maps/place/CHED/@7.0731,125.6128,18z';

    $this->actingAs($admin)
        ->patch(route('events-management.venue', $event), [
            'venue_name' => 'CHED Regional Office',
            'venue_address' => 'Davao City',
            'venue_map_link' => $mapLink,
            'venue_latitude' => '',
            'venue_longitude' => '',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->assertDatabaseHas('events', [
        'id' => $event->id,
        'venue_map_link' => $mapLink,
        'venue_latitude' => null,
        'venue_longitude' => null,
    ]);

    $this->get(route('events-management'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('events_management')
            ->where('events.3.venue_map_link', $mapLink));

    $this->get(route('events'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('events')
            ->where('events.3.venue_map_link', $mapLink));
});

test('a complete coordinate pair can be used without a Google Maps link', function () {
    $admin = User::factory()->create([
        'participant_type' => 'admin',
        'organization' => 'Commission on Higher Education',
    ]);
    $event = Event::query()->create([
        'name' => 'Coordinate Venue Test Event',
        'slug' => 'coordinate-venue-test-event',
        'is_active' => true,
    ]);

    $this->actingAs($admin)
        ->patch(route('events-management.venue', $event), [
            'venue_name' => 'CHED Regional Office',
            'venue_address' => 'Davao City',
            'venue_map_link' => '',
            'venue_latitude' => '7.0731000',
            'venue_longitude' => '125.6128000',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->assertDatabaseHas('events', [
        'id' => $event->id,
        'venue_map_link' => null,
        'venue_latitude' => '7.0731000',
        'venue_longitude' => '125.6128000',
    ]);
});
