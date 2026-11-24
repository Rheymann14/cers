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

function fakePortalHeis(): void
{
    Http::fake([
        '*/fetch-all-hei' => Http::response([
            ['instCode' => '12001', 'instName' => 'NOTRE DAME OF MARBEL UNIVERSITY', 'province' => 'SOUTH COTABATO', 'municipalityCity' => 'KORONADAL CITY', 'status' => '1'],
            ['instCode' => '11048', 'instName' => 'MINDANAO STATE UNIVERSITY - GENERAL SANTOS CITY', 'province' => 'SOUTH COTABATO', 'municipalityCity' => 'GENERAL SANTOS CITY', 'status' => '1'],
        ]),
    ]);
}

beforeEach(function () {
    config([
        'services.hei_directory.source' => 'auther_space',
        'services.portal.api_key' => 'test-portal-key',
        'services.portal.base_url' => 'https://portal.test/api',
    ]);

    $this->admin = User::factory()->create(['participant_type' => 'admin']);
    $this->event = Event::query()->create([
        'name' => 'HEI Summit',
        'slug' => 'hei-summit',
        'is_active' => true,
    ]);
});

test('splits portal HEIs into registered and not registered for the selected event', function () {
    fakeHeiDirectory();
    registerFromSchool($this->event, '  notre dame of MARBEL university ');
    registerFromSchool($this->event, 'Notre Dame of Marbel University');

    $response = $this->actingAs($this->admin)
        ->getJson(route('participants.unregistered-heis', ['event' => 'hei-summit']))
        ->assertOk()
        ->assertJsonPath('total', 3)
        ->assertJsonPath('registered', 1)
        ->assertJsonPath('unregistered', 2)
        ->assertJsonCount(3, 'data');

    $rows = collect($response->json('data'))->keyBy('uii');

    expect($rows['12001'])->toMatchArray(['is_registered' => true, 'participants_count' => 2])
        ->and($rows['12002'])->toMatchArray(['is_registered' => false, 'participants_count' => 0])
        ->and($rows['12003'])->toMatchArray(['is_registered' => false, 'participants_count' => 0])
        ->and($rows['12001'])->not->toHaveKey('key');
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
        ->assertJsonPath('unregistered', 3);
});

test('returns 503 when the HEI directory is unreachable and nothing is cached', function () {
    Http::fake(['*/api/heis' => Http::response('down', 500)]);

    $this->actingAs($this->admin)
        ->getJson(route('participants.unregistered-heis', ['event' => 'hei-summit']))
        ->assertStatus(503);
});

test('reads HEIs from the portal with the API key and maps its fields', function () {
    config(['services.hei_directory.source' => 'portal']);
    fakePortalHeis();
    registerFromSchool($this->event, 'Notre Dame of Marbel University');

    $response = $this->actingAs($this->admin)
        ->getJson(route('participants.unregistered-heis', ['event' => 'hei-summit']))
        ->assertOk()
        ->assertJsonPath('total', 2)
        ->assertJsonPath('registered', 1)
        ->assertJsonPath('unregistered', 1);

    $rows = collect($response->json('data'))->keyBy('uii');

    expect($rows['12001'])->toMatchArray([
        'name' => 'NOTRE DAME OF MARBEL UNIVERSITY',
        'province' => 'SOUTH COTABATO',
        'city_municipality' => 'KORONADAL CITY',
        'is_registered' => true,
        'participants_count' => 1,
    ])->and($rows['11048'])->toMatchArray(['is_registered' => false]);

    Http::assertSent(fn ($request) => $request->url() === 'https://portal.test/api/fetch-all-hei'
        && $request->hasHeader('PORTAL-API', 'test-portal-key'));
});

test('returns 503 when the portal source has no API key and nothing is cached', function () {
    config([
        'services.hei_directory.source' => 'portal',
        'services.portal.api_key' => null,
    ]);
    Http::fake();

    $this->actingAs($this->admin)
        ->getJson(route('participants.unregistered-heis', ['event' => 'hei-summit']))
        ->assertStatus(503);

    Http::assertNothingSent();
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
