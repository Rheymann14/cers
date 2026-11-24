<?php

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

function fakeHeiDirectory(): void
{
    Http::fake([
        '*/api/heis' => Http::response([
            'data' => [
                ['uii' => '12001', 'name' => 'Notre Dame of Marbel University', 'province' => 'South Cotabato', 'city_municipality' => 'Koronadal City'],
                ['uii' => '12002', 'name' => 'Mindanao State University - General Santos', 'province' => 'South Cotabato', 'city_municipality' => 'General Santos City'],
                ['uii' => '12003', 'name' => 'Sultan Kudarat State University', 'province' => 'Sultan Kudarat', 'city_municipality' => 'Tacurong City'],
            ],
        ]),
    ]);
}

function registerFromSchool(Event $event, string $school, bool $deleted = false): void
{
    $user = User::factory()->create(['organization' => $school]);

    EventRegistration::query()->create([
        'user_id' => $user->id,
        'event_id' => $event->id,
        'organization' => $school,
        'participant_type' => 'participant',
    ]);

    if ($deleted) {
        $user->delete();
    }
}

beforeEach(function () {
    $this->admin = User::factory()->create(['participant_type' => 'admin']);
    $this->event = Event::query()->create([
        'name' => 'HEI Summit',
        'slug' => 'hei-summit',
        'is_active' => true,
    ]);
});

test('lists portal HEIs with no registration for the selected event', function () {
    fakeHeiDirectory();
    registerFromSchool($this->event, '  notre dame of MARBEL university ');

    $response = $this->actingAs($this->admin)
        ->getJson(route('participants.unregistered-heis', ['event' => 'hei-summit']))
        ->assertOk()
        ->assertJsonPath('total', 3)
        ->assertJsonPath('registered', 1)
        ->assertJsonCount(2, 'data');

    expect(collect($response->json('data'))->pluck('uii')->all())
        ->toBe(['12002', '12003']);
    expect($response->json('data.0'))->not->toHaveKey('key');
});

test('registrations from other events or deleted participants do not count', function () {
    fakeHeiDirectory();
    $otherEvent = Event::query()->create([
        'name' => 'Other Event',
        'slug' => 'other-event',
        'is_active' => true,
    ]);
    registerFromSchool($otherEvent, 'Notre Dame of Marbel University');
    registerFromSchool($this->event, 'Sultan Kudarat State University', deleted: true);

    $this->actingAs($this->admin)
        ->getJson(route('participants.unregistered-heis', ['event' => 'hei-summit']))
        ->assertOk()
        ->assertJsonPath('registered', 0)
        ->assertJsonCount(3, 'data');
});

test('returns 503 when the HEI directory is unreachable and nothing is cached', function () {
    Http::fake(['*/api/heis' => Http::response('down', 500)]);

    $this->actingAs($this->admin)
        ->getJson(route('participants.unregistered-heis', ['event' => 'hei-summit']))
        ->assertStatus(503);
});

test('requires a valid event', function () {
    fakeHeiDirectory();

    $this->actingAs($this->admin)
        ->getJson(route('participants.unregistered-heis'))
        ->assertUnprocessable();

    $this->actingAs($this->admin)
        ->getJson(route('participants.unregistered-heis', ['event' => 'missing']))
        ->assertUnprocessable();
});

test('guests cannot view unregistered HEIs', function () {
    $this->get(route('participants.unregistered-heis', ['event' => 'hei-summit']))
        ->assertRedirect(route('login'));
});
