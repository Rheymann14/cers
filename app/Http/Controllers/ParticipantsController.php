<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\ParticipantType;
use App\Models\User;
use App\Models\UserRole;
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
            'event_name' => ['required', 'string', Rule::in([
                'ched-regional-orientation',
                'higher-education-summit',
                'faculty-development-workshop',
            ])],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $name = trim(collect([
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
        $participantType = ParticipantType::query()->firstOrCreate(
            ['slug' => $validated['participant_type']],
            [
                'name' => str($validated['participant_type'])->headline()->toString(),
                'is_active' => true,
            ],
        );
        $role = UserRole::query()->where('slug', 'participant')->first();

        User::query()->create([
            'name' => $name,
            'participant_id' => $this->generateParticipantId(),
            'given_name' => $validated['given_name'],
            'middle_name' => $validated['middle_name'] ?? null,
            'surname' => $validated['surname'],
            'email' => $validated['email'],
            'avatar' => $this->storeAvatar($validated['avatar'] ?? null),
            'phone' => $validated['phone'],
            'user_role_id' => $role?->id,
            'organization_id' => $organization->id,
            'participant_type_id' => $participantType->id,
            'organization' => $validated['organization'],
            'participant_type' => $validated['participant_type'],
            'sex' => $validated['sex'],
            'event_name' => $validated['event_name'],
            'registration_consent_accepted_at' => now(),
            'password' => $validated['password'],
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
            'event_name' => ['required', 'string', Rule::in([
                'ched-regional-orientation',
                'higher-education-summit',
                'faculty-development-workshop',
            ])],
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
        $participantType = ParticipantType::query()->firstOrCreate(
            ['slug' => $validated['participant_type']],
            [
                'name' => str($validated['participant_type'])->headline()->toString(),
                'is_active' => true,
            ],
        );
        $validated['organization_id'] = $organization->id;
        $validated['participant_type_id'] = $participantType->id;

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
