<?php

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('editing an existing secondary event registration does not report it as a duplicate', function () {
    $admin = User::factory()->create(['participant_type' => 'admin']);
    $primaryEvent = Event::query()->create([
        'name' => 'Primary Event',
        'slug' => 'primary-event',
        'is_active' => true,
    ]);
    $secondaryEvent = Event::query()->create([
        'name' => 'Secondary Event',
        'slug' => 'secondary-event',
        'is_active' => true,
    ]);
    $primaryOrganization = Organization::query()->create([
        'event_id' => $primaryEvent->id,
        'name' => 'Primary Organization',
        'slug' => 'primary-organization',
        'type' => 'school',
        'is_active' => true,
    ]);
    $secondaryOrganization = Organization::query()->create([
        'event_id' => $secondaryEvent->id,
        'name' => 'Secondary Organization',
        'slug' => 'secondary-organization',
        'type' => 'school',
        'is_active' => true,
    ]);
    $participant = User::factory()->create([
        'given_name' => 'Original',
        'surname' => 'Participant',
        'sex' => 'male',
        'event_id' => $primaryEvent->id,
        'event_name' => $primaryEvent->slug,
        'organization_id' => $primaryOrganization->id,
        'organization' => $primaryOrganization->name,
        'participant_type' => 'admin',
    ]);

    EventRegistration::query()->create([
        'user_id' => $participant->id,
        'event_id' => $primaryEvent->id,
        'organization_id' => $primaryOrganization->id,
        'organization' => $primaryOrganization->name,
        'participant_type' => 'admin',
    ]);
    $secondaryRegistration = EventRegistration::query()->create([
        'user_id' => $participant->id,
        'event_id' => $secondaryEvent->id,
        'organization_id' => $secondaryOrganization->id,
        'organization' => $secondaryOrganization->name,
        'participant_type' => 'admin',
    ]);

    $this->actingAs($admin)
        ->patch(route('participants.update', $participant), [
            'given_name' => 'Edited',
            'middle_name' => '',
            'surname' => 'Participant',
            'email' => $participant->email,
            'phone' => '',
            'province' => '',
            'municipality' => '',
            'organization' => $secondaryOrganization->name,
            'participant_type' => 'admin',
            'sex' => 'male',
            'event_name' => $secondaryEvent->slug,
            'original_event_name' => $secondaryEvent->slug,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($participant->fresh())
        ->given_name->toBe('Edited')
        ->event_id->toBe($primaryEvent->id)
        ->organization->toBe($primaryOrganization->name);

    expect($secondaryRegistration->fresh())
        ->event_id->toBe($secondaryEvent->id)
        ->organization->toBe($secondaryOrganization->name);
});

test('moving a registration to an event already registered still reports a duplicate', function () {
    $admin = User::factory()->create(['participant_type' => 'admin']);
    $primaryEvent = Event::query()->create([
        'name' => 'Primary Event',
        'slug' => 'primary-event',
        'is_active' => true,
    ]);
    $secondaryEvent = Event::query()->create([
        'name' => 'Secondary Event',
        'slug' => 'secondary-event',
        'is_active' => true,
    ]);
    $primaryOrganization = Organization::query()->create([
        'event_id' => $primaryEvent->id,
        'name' => 'Primary Organization',
        'slug' => 'primary-organization',
        'type' => 'school',
        'is_active' => true,
    ]);
    $participant = User::factory()->create([
        'given_name' => 'Original',
        'surname' => 'Participant',
        'sex' => 'male',
        'event_id' => $primaryEvent->id,
        'event_name' => $primaryEvent->slug,
        'organization_id' => $primaryOrganization->id,
        'organization' => $primaryOrganization->name,
        'participant_type' => 'admin',
    ]);

    EventRegistration::query()->create([
        'user_id' => $participant->id,
        'event_id' => $primaryEvent->id,
        'organization_id' => $primaryOrganization->id,
        'organization' => $primaryOrganization->name,
        'participant_type' => 'admin',
    ]);
    $secondaryRegistration = EventRegistration::query()->create([
        'user_id' => $participant->id,
        'event_id' => $secondaryEvent->id,
        'participant_type' => 'admin',
    ]);

    $this->actingAs($admin)
        ->from(route('participants'))
        ->patch(route('participants.update', $participant), [
            'given_name' => 'Original',
            'middle_name' => '',
            'surname' => 'Participant',
            'email' => $participant->email,
            'phone' => '',
            'province' => '',
            'municipality' => '',
            'organization' => $primaryOrganization->name,
            'participant_type' => 'admin',
            'sex' => 'male',
            'event_name' => $primaryEvent->slug,
            'original_event_name' => $secondaryEvent->slug,
        ])
        ->assertRedirect(route('participants'))
        ->assertSessionHasErrors([
            'event_name' => 'This participant is already registered for the selected event.',
        ]);

    expect($secondaryRegistration->fresh()->event_id)->toBe($secondaryEvent->id);
});
