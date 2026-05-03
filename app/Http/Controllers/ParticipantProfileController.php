<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\ParticipantType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ParticipantProfileController extends Controller
{
    public function edit(Request $request): Response
    {
        return Inertia::render('participant_profile', [
            'participantTypes' => ParticipantType::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['slug as value', 'name as label']),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'given_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'surname' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'avatar' => ['nullable', 'string'],
            'remove_avatar' => ['nullable', 'boolean'],
            'phone' => ['required', 'string', 'regex:/^09\d{9}$/'],
            'organization' => ['required', 'string', 'max:255'],
            'position' => ['nullable', 'string', 'max:255'],
            'sex' => ['required', 'string', Rule::in(['male', 'female'])],
            'event_name' => ['required', 'string', Rule::in([
                'ched-regional-orientation',
                'higher-education-summit',
                'faculty-development-workshop',
            ])],
        ]);

        $avatar = $validated['avatar'] ?? null;
        $removeAvatar = $request->boolean('remove_avatar');

        unset($validated['avatar'], $validated['remove_avatar']);

        $validated['name'] = trim(collect([
            $validated['given_name'],
            $validated['middle_name'] ?? null,
            $validated['surname'],
        ])->filter()->implode(' '));

        $organization = Organization::query()->firstOrCreate(
            ['slug' => Str::slug($validated['organization'])],
            [
                'name' => $validated['organization'],
                'type' => 'school',
                'is_active' => true,
            ],
        );

        $validated['organization_id'] = $organization->id;

        $user->fill($validated);

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        if ($removeAvatar || $avatar) {
            $this->deleteAvatar($user->avatar);
            $user->avatar = $avatar ? $this->storeAvatar($avatar) : null;
        }

        $user->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Participant profile updated.']);

        return to_route('participant-profile.edit');
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

    private function deleteAvatar(?string $avatar): void
    {
        if (! $avatar) {
            return;
        }

        $storagePath = Str::after($avatar, '/storage/');

        if ($storagePath !== $avatar) {
            Storage::disk('public')->delete($storagePath);
        }
    }
}
