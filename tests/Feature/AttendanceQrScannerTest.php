<?php

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Carbon\Carbon;
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
            'attendance_date' => now()->toDateString(),
            'mode' => 'manual',
            'value' => 'MULT',
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
            'attendance_date' => now()->toDateString(),
            'mode' => 'manual',
            'value' => $participant->participant_id,
        ])
        ->assertUnprocessable()
        ->assertJsonPath(
            'message',
            'This participant is not registered for the selected event.',
        );
});

test('a participant can check in once on every day of a multi-day event', function () {
    Carbon::setTestNow('2026-08-04 09:00:00');

    $admin = User::factory()->create([
        'participant_type' => 'admin',
    ]);
    $participant = User::factory()->create([
        'participant_id' => 'CERS-DAY1-2026',
        'participant_type' => 'participant',
        'is_active' => true,
    ]);
    $event = Event::query()->create([
        'name' => 'Three Day Event',
        'slug' => 'three-day-event',
        'starts_at' => '2026-08-04 00:00:00',
        'ends_at' => '2026-08-06 09:00:00',
        'is_active' => true,
    ]);

    EventRegistration::query()->create([
        'user_id' => $participant->id,
        'event_id' => $event->id,
        'participant_type' => 'participant',
    ]);

    $this->actingAs($admin);

    foreach (['2026-08-04', '2026-08-05', '2026-08-06'] as $attendanceDate) {
        $this->postJson(route('attendance-qr-scanner.check-in'), [
            'event_id' => $event->id,
            'attendance_date' => $attendanceDate,
            'mode' => 'manual',
            'value' => 'DAY1',
        ])->assertOk()
            ->assertJsonPath('already_checked_in', false)
            ->assertJsonPath('attendance_date', $attendanceDate);
    }

    expect($participant->attendances)
        ->toHaveCount(3)
        ->and($participant->attendances->pluck('attendance_date')->map->toDateString()->all())
        ->toBe(['2026-08-04', '2026-08-05', '2026-08-06']);

    $this->postJson(route('attendance-qr-scanner.check-in'), [
        'event_id' => $event->id,
        'attendance_date' => '2026-08-05',
        'mode' => 'manual',
        'value' => 'DAY1',
    ])->assertOk()
        ->assertJsonPath('already_checked_in', true);

    expect($participant->attendances()->count())->toBe(3);
});

test('attendance cannot be recorded outside the event date range', function () {
    $admin = User::factory()->create(['participant_type' => 'admin']);
    $participant = User::factory()->create([
        'participant_id' => 'CERS-DATE-2026',
        'participant_type' => 'participant',
        'is_active' => true,
    ]);
    $event = Event::query()->create([
        'name' => 'Dated Event',
        'slug' => 'dated-event',
        'starts_at' => '2026-08-04 00:00:00',
        'ends_at' => '2026-08-06 09:00:00',
        'is_active' => true,
    ]);

    EventRegistration::query()->create([
        'user_id' => $participant->id,
        'event_id' => $event->id,
        'participant_type' => 'participant',
    ]);

    $this->actingAs($admin)
        ->postJson(route('attendance-qr-scanner.check-in'), [
            'event_id' => $event->id,
            'attendance_date' => '2026-08-07',
            'mode' => 'manual',
            'value' => $participant->participant_id,
        ])
        ->assertUnprocessable()
        ->assertJsonPath(
            'message',
            'The attendance date must be one of the selected event dates.',
        );
});
