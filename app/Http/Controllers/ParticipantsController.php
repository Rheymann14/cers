<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\ParticipantType;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ParticipantsController extends Controller
{
    public function __invoke(): Response
    {
        $columns = [
            'id',
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
        ]);
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
            'phone' => ['required', 'string', 'max:50'],
            'organization' => ['required', 'string', 'max:255'],
            'participant_type' => ['required', 'string', Rule::in(['student', 'faculty', 'staff', 'guest'])],
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
}
