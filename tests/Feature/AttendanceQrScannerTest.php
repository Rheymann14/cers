<?php

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a participant can check in to every event they are registered for', function () {
    $admin = User::factory()->create([
        'participant_type' => 'admin',
    ]);
    $participant = User::factory()->create([
        'participant_id' => 'CERS-MULT-2026',
        'participant_type' => 'participant',
        'is_active' => true,
    ]);
    $events = Event::query()->limit(2)->get();

    expect($events)->toHaveCount(2);

    $events->each(function (Event $event) use ($participant): void {
        $event->update([
            'starts_at' => now()->subHour(),
            'ends_at' => now()->addDay(),
            'is_active' => true,
        ]);
        EventRegistration::query()->create([
            'user_id' => $participant->id,
            'event_id' => $event->id,
            'participant_type' => 'participant',
        ]);
    });

    $this->actingAs($admin);

    foreach ($events as $event) {
        $this->postJson(route('attendance-qr-scanner.check-in'), [
            'event_id' => $event->id,
            'mode' => 'manual',
            'value' => $participant->participant_id,
        ])->assertOk()
            ->assertJsonPath('already_checked_in', false);
    }

    expect($participant->attendances()->count())->toBe(2);
});

test('a participant cannot check in to an event without a registration', function () {
    $admin = User::factory()->create([
        'participant_type' => 'admin',
    ]);
    $participant = User::factory()->create([
        'participant_id' => 'CERS-NONE-2026',
        'participant_type' => 'participant',
        'is_active' => true,
    ]);
    $event = Event::query()->firstOrFail();
    $event->update([
        'starts_at' => now()->subHour(),
        'ends_at' => now()->addDay(),
        'is_active' => true,
    ]);

    $this->actingAs($admin)
        ->postJson(route('attendance-qr-scanner.check-in'), [
            'event_id' => $event->id,
            'mode' => 'manual',
            'value' => $participant->participant_id,
        ])
        ->assertUnprocessable()
        ->assertJsonPath(
            'message',
            'This participant is not registered for the selected event.',
        );
});
