<?php

use App\Models\Event;
use App\Models\EventAttendance;
use App\Models\EventCertificate;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function certificateAdmin(): User
{
    return User::factory()->create([
        'participant_type' => 'admin',
        'organization' => 'Commission on Higher Education',
    ]);
}

function certificateEvent(): Event
{
    return Event::query()->create([
        'name' => 'Certificate Test Event',
        'slug' => 'certificate-test-event',
        'venue_name' => 'PICC',
        'starts_at' => now()->subDay(),
        'ends_at' => now()->addDay(),
        'is_active' => true,
    ]);
}

function registerParticipant(Event $event, string $name, bool $checkedIn): User
{
    $participant = User::factory()->create([
        'name' => $name,
        'participant_type' => 'participant',
    ]);

    EventRegistration::query()->create([
        'user_id' => $participant->id,
        'event_id' => $event->id,
        'organization' => 'Sample University',
        'position' => 'Student',
        'participant_type' => 'participant',
    ]);

    if ($checkedIn) {
        EventAttendance::query()->create([
            'event_id' => $event->id,
            'user_id' => $participant->id,
            'attendance_date' => now()->toDateString(),
            'checked_in_at' => now(),
        ]);
    }

    return $participant;
}

test('the certificates page lists only checked-in participants of the selected event', function () {
    $event = certificateEvent();
    registerParticipant($event, 'Ana Checked', true);
    registerParticipant($event, 'Ben Absent', false);

    $this->actingAs(certificateAdmin())
        ->get(route('certificates', ['event' => $event->slug]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('certificates')
            ->where('selectedEvent.slug', $event->slug)
            ->where('certificate.is_configured', false)
            ->where('certificate.appearance.title', 'CERTIFICATE OF APPEARANCE')
            ->where('participants.total', 1)
            ->where('participants.data.0.name', 'Ana Checked')
            ->where('participants.data.0.organization', 'Sample University'));
});

test('certificate recipients can be searched and narrowed to selected participants', function () {
    $event = certificateEvent();
    $ana = registerParticipant($event, 'Ana Checked', true);
    registerParticipant($event, 'Carlo Checked', true);
    registerParticipant($event, 'Ben Absent', false);
    $admin = certificateAdmin();

    $this->actingAs($admin)
        ->getJson(route('certificates.recipients', $event))
        ->assertOk()
        ->assertJsonCount(2);

    $this->actingAs($admin)
        ->getJson(route('certificates.recipients', ['event' => $event, 'search' => 'carlo']))
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.name', 'Carlo Checked');

    $this->actingAs($admin)
        ->getJson(route('certificates.recipients', ['event' => $event, 'ids' => [$ana->id]]))
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.id', $ana->id);
});

test('certificate settings can be saved with backgrounds, logo and signatories', function () {
    Storage::fake();
    $event = certificateEvent();

    $this->actingAs(certificateAdmin())
        ->post(route('certificates.update', $event), [
            '_method' => 'patch',
            'logo' => UploadedFile::fake()->image('logo.png', 400, 80),
            'appearance_background' => UploadedFile::fake()->image('appearance.jpg', 1400, 1000),
            'participation_background' => UploadedFile::fake()->image('participation.png', 1400, 1000),
            'appearance' => [
                'title' => 'CERTIFICATE OF APPEARANCE',
                'intro' => 'This is to certify that',
                'body' => 'has appeared during {event}.',
                'footer' => 'Given this {given_date}.',
                'vertical_offset' => 5,
            ],
            'participation' => [
                'title' => 'CERTIFICATE OF PARTICIPATION',
                'intro' => 'This certificate is hereby given to',
                'body' => 'for actively participating in {event}.',
                'footer' => '',
                'vertical_offset' => 0,
            ],
            'signatories' => [
                [
                    'name' => 'Atty. Juan Dela Cruz',
                    'position' => 'Executive Director IV',
                    'signature' => UploadedFile::fake()->image('signature.png', 300, 100),
                ],
            ],
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $certificate = EventCertificate::query()->where('event_id', $event->id)->firstOrFail();

    expect($certificate->appearance_content['vertical_offset'])->toBe(5)
        ->and($certificate->participation_content['footer'])->toBe('')
        ->and($certificate->signatories)->toHaveCount(1)
        ->and($certificate->signatories[0]['name'])->toBe('Atty. Juan Dela Cruz');

    foreach ($certificate->storedPaths() as $path) {
        Storage::assertExists($path);
    }

    $this->get(route('certificates.assets', $certificate->signatories[0]['signature_path']))
        ->assertOk();
});

test('removed signatures and replaced images are deleted and foreign paths are ignored', function () {
    Storage::fake();
    $event = certificateEvent();
    $admin = certificateAdmin();
    $content = fn (string $title) => ['title' => $title, 'intro' => '', 'body' => '', 'footer' => '', 'vertical_offset' => 0];

    $this->actingAs($admin)->post(route('certificates.update', $event), [
        '_method' => 'patch',
        'logo' => UploadedFile::fake()->image('logo.png'),
        'appearance' => $content('A'),
        'participation' => $content('P'),
        'signatories' => [
            ['name' => 'First', 'signature' => UploadedFile::fake()->image('first.png')],
        ],
    ])->assertSessionHasNoErrors();

    $original = EventCertificate::query()->firstOrFail();
    $oldLogo = $original->logo_path;
    $oldSignature = $original->signatories[0]['signature_path'];

    $this->actingAs($admin)->post(route('certificates.update', $event), [
        '_method' => 'patch',
        'remove_logo' => true,
        'appearance' => $content('A'),
        'participation' => $content('P'),
        'signatories' => [
            ['name' => 'First', 'signature_path' => 'event-images/not-owned.png'],
        ],
    ])->assertSessionHasNoErrors();

    $certificate = $original->fresh();

    expect($certificate->logo_path)->toBeNull()
        ->and($certificate->signatories[0]['signature_path'])->toBeNull();
    Storage::assertMissing($oldLogo);
    Storage::assertMissing($oldSignature);
});

test('certificate assets require an administrator', function () {
    Storage::fake();
    Storage::put('certificate-assets/signature.png', 'image');
    $participant = User::factory()->create(['participant_type' => 'participant']);

    $this->get(route('certificates.assets', 'certificate-assets/signature.png'))
        ->assertRedirect(route('login'));

    $this->actingAs($participant)
        ->get(route('certificates.assets', 'certificate-assets/signature.png'))
        ->assertRedirect(route('participant-profile.edit'));

    $this->actingAs(certificateAdmin())
        ->get(route('certificates.assets', 'event-images/other.png'))
        ->assertNotFound();
});
