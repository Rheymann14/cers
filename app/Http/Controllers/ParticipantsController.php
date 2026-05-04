<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Organization;
use App\Models\ParticipantType;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ParticipantsController extends Controller
{
    public function __invoke(): Response
    {
        $columns = [
            'id',
            'participant_id',
            'name',
            'given_name',
            'middle_name',
            'surname',
            'email',
            'avatar',
            'phone',
            'organization',
            'participant_type',
            'sex',
            'event_name',
            'is_active',
            'created_at',
            'deleted_at',
        ];

        return Inertia::render('participants', [
            'participants' => User::query()
                ->latest()
                ->get($columns),
            'deletedParticipants' => User::query()
                ->onlyTrashed()
                ->latest('deleted_at')
                ->get($columns),
            'organizations' => Organization::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['name as value', 'name as label']),
            'participantTypes' => ParticipantType::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['slug as value', 'name as label']),
            'events' => Event::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['slug as value', 'name as label']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'given_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'surname' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique(User::class)],
            'avatar' => ['nullable', 'string'],
            'phone' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'organization' => [
                'nullable',
                'string',
                'max:255',
                Rule::exists('organizations', 'name')->where('is_active', true),
            ],
            'participant_type' => [
                'required',
                'string',
                Rule::exists('participant_types', 'slug')->where('is_active', true),
            ],
            'sex' => ['required', 'string', Rule::in(['male', 'female'])],
            'event_name' => [
                'nullable',
                'string',
                Rule::exists('events', 'slug')->where('is_active', true),
            ],
        ]);

        $name = trim(collect([
            $validated['given_name'],
            $validated['middle_name'] ?? null,
            $validated['surname'],
        ])->filter()->implode(' '));
        $organization = isset($validated['organization'])
            ? Organization::query()->firstOrCreate(
                ['slug' => str($validated['organization'])->slug()->toString()],
                [
                    'name' => $validated['organization'],
                    'type' => 'school',
                    'is_active' => true,
                ],
            )
            : null;
        $event = isset($validated['event_name'])
            ? Event::query()
                ->where('slug', $validated['event_name'])
                ->where('is_active', true)
                ->first()
            : null;

        User::query()->create([
            'name' => $name,
            'participant_id' => $this->generateParticipantId(),
            'given_name' => $validated['given_name'],
            'middle_name' => $validated['middle_name'] ?? null,
            'surname' => $validated['surname'],
            'email' => $validated['email'],
            'avatar' => $this->storeAvatar($validated['avatar'] ?? null),
            'phone' => $validated['phone'] ?? null,
            'organization_id' => $organization?->id,
            'organization' => $validated['organization'] ?? null,
            'participant_type' => $validated['participant_type'],
            'sex' => $validated['sex'],
            'event_id' => $event?->id,
            'event_name' => $event?->slug,
            'is_active' => true,
            'registration_consent_accepted_at' => now(),
            'password' => 'cers2026',
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Participant added successfully.',
        ]);

        return back();
    }

    public function update(Request $request, User $participant): RedirectResponse
    {
        $validated = $request->validate([
            'given_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'surname' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($participant),
            ],
            'phone' => ['required', 'string', 'regex:/^09\d{9}$/'],
            'organization' => [
                'required',
                'string',
                'max:255',
                Rule::exists('organizations', 'name')->where('is_active', true),
            ],
            'participant_type' => [
                'required',
                'string',
                Rule::exists('participant_types', 'slug')->where('is_active', true),
            ],
            'sex' => ['required', 'string', Rule::in(['male', 'female'])],
            'event_name' => [
                'required',
                'string',
                Rule::exists('events', 'slug'),
            ],
        ]);

        $validated['name'] = trim(collect([
            $validated['given_name'],
            $validated['middle_name'] ?? null,
            $validated['surname'],
        ])->filter()->implode(' '));
        $organization = Organization::query()->firstOrCreate(
            ['slug' => str($validated['organization'])->slug()->toString()],
            [
                'name' => $validated['organization'],
                'type' => 'school',
                'is_active' => true,
            ],
        );
        $validated['organization_id'] = $organization->id;
        $event = Event::query()
            ->where('slug', $validated['event_name'])
            ->firstOrFail();
        $validated['event_id'] = $event->id;
        $validated['event_name'] = $event->slug;

        $participant->update($validated);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Participant updated successfully.',
        ]);

        return back();
    }

    public function destroy(User $participant): RedirectResponse
    {
        $participant->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Participant deleted successfully.',
        ]);

        return back();
    }

    public function restore(int $participant): RedirectResponse
    {
        $deletedParticipant = User::query()
            ->onlyTrashed()
            ->findOrFail($participant);

        $deletedParticipant->restore();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Participant restored successfully.',
        ]);

        return back();
    }

    public function toggleStatus(Request $request, User $participant): RedirectResponse
    {
        if ($request->user()?->is($participant) && $participant->is_active) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'You cannot set your own account inactive.',
            ]);

            return back();
        }

        $participant->update([
            'is_active' => ! $participant->is_active,
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $participant->is_active
                ? 'Participant set active successfully.'
                : 'Participant set inactive successfully.',
        ]);

        return back();
    }

    public function resetPassword(User $participant): RedirectResponse
    {
        $participant->update([
            'password' => 'cers2026',
        ]);

        return back();
    }

    private function generateParticipantId(): string
    {
        $year = now()->year;

        do {
            $participantId = 'CERS-'.Str::upper(Str::random(4)).'-'.$year;
        } while (User::query()->where('participant_id', $participantId)->exists());

        return $participantId;
    }

    private function storeAvatar(?string $avatar): ?string
    {
        if (! $avatar || ! preg_match('/^data:image\/(png|jpeg);base64,/', $avatar, $matches)) {
            return null;
        }

        $contents = base64_decode(substr($avatar, strpos($avatar, ',') + 1), true);

        if ($contents === false) {
            return null;
        }

        $extension = $matches[1] === 'png' ? 'png' : 'jpg';
        $path = 'profile-photos/'.Str::uuid().'.'.$extension;

        Storage::disk('public')->put($path, $contents);

        return Storage::url($path);
    }
}
