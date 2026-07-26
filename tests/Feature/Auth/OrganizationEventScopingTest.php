<?php

use App\Models\Event;
use App\Models\Municipality;
use App\Models\Organization;
use App\Models\Province;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('registration stores and exposes a custom organization only for its event', function () {
    $event = Event::query()
        ->where('slug', 'ched-regional-orientation')
        ->firstOrFail();
    $otherEvent = Event::query()
        ->where('slug', 'higher-education-summit')
        ->firstOrFail();

    $event->update([
        'starts_at' => now()->subHour(),
        'ends_at' => now()->addDay(),
        'is_registration_closed' => false,
    ]);
    $otherEvent->update([
        'starts_at' => now()->subHour(),
        'ends_at' => now()->addDay(),
        'is_registration_closed' => false,
    ]);
    Organization::query()->create([
        'name' => 'Default State University',
        'slug' => 'default-state-university',
        'type' => 'institution',
        'is_active' => true,
    ]);

    $province = Province::query()->create([
        'name' => 'Bukidnon',
        'code' => '1001300000',
        'region_code' => '1000000000',
        'region_name' => 'Region X (Northern Mindanao)',
        'is_active' => true,
    ]);
    $municipality = Municipality::query()->create([
        'province_id' => $province->id,
        'name' => 'City of Malaybalay',
        'code' => '1001312000',
        'type' => 'City',
        'is_active' => true,
    ]);

    $this->post(route('event-registration.store'), [
        'given_name' => 'Event',
        'surname' => 'Scoped',
        'email' => 'event-scoped@example.com',
        'phone' => '09171234567',
        'province' => $province->code,
        'municipality' => $municipality->code,
        'organization' => 'Event Scoped University',
        'participant_type' => 'Event Scoped Attendee',
        'sex' => 'female',
        'event_name' => $event->slug,
        'consent' => 'yes',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertRedirect();

    $this->assertDatabaseHas('organizations', [
        'event_id' => $event->id,
        'slug' => 'event-scoped-university',
    ]);
    $this->assertDatabaseMissing('organizations', [
        'event_id' => $otherEvent->id,
        'slug' => 'event-scoped-university',
    ]);

    auth()->logout();

    $this->post(route('event-registration.store'), [
        'given_name' => 'Default',
        'surname' => 'Organization',
        'email' => 'default-organization@example.com',
        'phone' => '09171234568',
        'province' => $province->code,
        'municipality' => $municipality->code,
        'organization' => 'Default State University',
        'participant_type' => 'Default Organization Attendee',
        'sex' => 'male',
        'event_name' => $otherEvent->slug,
        'consent' => 'yes',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertRedirect();

    $this->assertDatabaseMissing('organizations', [
        'event_id' => $otherEvent->id,
        'slug' => 'default-state-university',
    ]);

    $organizations = collect(
        $this->getJson(route('welcome.lookups'))
            ->assertOk()
            ->json('organizations'),
    );
    $customOrganizations = $organizations->where(
        'value',
        'Event Scoped University',
    );
    $defaultOrganization = $organizations->firstWhere(
        'value',
        'Default State University',
    );

    expect($customOrganizations)->toHaveCount(1)
        ->and($customOrganizations->first()['event_slug'])->toBe($event->slug)
        ->and($defaultOrganization)->not->toBeNull()
        ->and($defaultOrganization['event_slug'])->toBeNull();
});
