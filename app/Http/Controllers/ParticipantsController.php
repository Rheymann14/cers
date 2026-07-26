<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Municipality;
use App\Models\Organization;
use App\Models\ParticipantType;
use App\Models\Province;
use App\Models\User;
use App\Services\BrevoEmailService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
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
            'province_id',
            'municipality_id',
            'is_active',
            'created_by_user_id',
            'created_at',
            'deleted_at',
            'deleted_by_user_id',
        ];

        return Inertia::render('participants', [
            'participants' => User::query()
                ->with(['province:id,code,name', 'municipality:id,code,name', 'createdBy:id,name'])
                ->latest()
                ->get($columns),
            'deletedParticipants' => User::query()
                ->onlyTrashed()
                ->with(['province:id,code,name', 'municipality:id,code,name', 'createdBy:id,name', 'deletedBy:id,name'])
                ->latest('deleted_at')
                ->get($columns),
            'organizations' => Organization::query()
                ->where('is_active', true)
                ->orderBy('type')
                ->orderBy('name')
                ->get([
                    'name as value',
                    'name as label',
                    'type',
                ]),
            'participantTypes' => ParticipantType::query()
                ->join('events', 'events.id', '=', 'participant_types.event_id')
                ->where('participant_types.is_active', true)
                ->orderByRaw("CASE WHEN type = '4ps' THEN 1 ELSE 2 END")
                ->orderBy('participant_types.name')
                ->get([
                    'participant_types.slug as value',
                    'participant_types.name as label',
                    'participant_types.type',
                    'events.slug as event_slug',
                ]),
            'events' => Event::query()
                ->where('is_active', true)
                ->orderByRaw('starts_at is null')
                ->orderBy('starts_at')
                ->orderBy('name')
                ->get([
                    'slug as value',
                    'name as label',
                    'starts_at',
                    'ends_at',
                ]),
            'addedByOptions' => collect([
                ['value' => 'system', 'label' => 'System', 'type' => 'system'],
            ])->concat(
                User::query()
                    ->whereIn('participant_type', ['admin', 'administrator'])
                    ->orderBy('name')
                    ->get(['id', 'name'])
                    ->map(fn (User $admin) => [
                        'value' => 'admin:'.$admin->id,
                        'label' => $admin->name,
                        'type' => 'administrator',
                    ]),
            )->values(),
            'provinces' => Province::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['code as value', 'name as label']),
        ]);
    }

    public function store(Request $request, BrevoEmailService $brevoEmailService): RedirectResponse
    {
        $validated = $request->validate([
            'given_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'surname' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'email', 'max:255', Rule::unique(User::class)],
            'avatar' => ['nullable', 'string'],
            'website' => ['prohibited'],
            'phone' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'province' => [
                'required',
                'string',
                Rule::exists('provinces', 'code')->where('is_active', true),
            ],
            'municipality' => [
                'required',
                'string',
                Rule::exists('municipalities', 'code')->where('is_active', true),
            ],
            'organization' => [
                'nullable',
                'string',
                'max:255',
                Rule::exists('organizations', 'name')->where('is_active', true),
            ],
            'participant_type' => [
                'required',
                'string',
                Rule::exists('participant_types', 'slug')->where(
                    fn ($query) => $query
                        ->where('is_active', true)
                        ->where('event_id', Event::query()
                            ->where('slug', $request->input('event_name'))
                            ->value('id')),
                ),
            ],
            'sex' => ['required', 'string', Rule::in(['male', 'female'])],
            'event_name' => [
                'nullable',
                'string',
                Rule::exists('events', 'slug')->where('is_active', true),
            ],
        ]);

        $province = Province::query()
            ->where('code', $validated['province'])
            ->where('is_active', true)
            ->firstOrFail();
        $municipality = Municipality::query()
            ->where('code', $validated['municipality'])
            ->where('province_id', $province->id)
            ->where('is_active', true)
            ->first();

        if (! $municipality) {
            return back()
                ->withErrors(['municipality' => 'The selected municipality must belong to the selected province.'])
                ->withInput();
        }

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

        $participant = User::query()->create([
            'name' => $name,
            'participant_id' => $this->generateParticipantId(),
            'given_name' => $validated['given_name'],
            'middle_name' => $validated['middle_name'] ?? null,
            'surname' => $validated['surname'],
            'email' => $validated['email'] ?? null,
            'avatar' => $this->storeAvatar($validated['avatar'] ?? null),
            'phone' => $validated['phone'] ?? null,
            'province_id' => $province->id,
            'municipality_id' => $municipality->id,
            'organization_id' => $organization?->id,
            'organization' => $validated['organization'] ?? null,
            'participant_type' => $validated['participant_type'],
            'sex' => $validated['sex'],
            'event_id' => $event?->id,
            'event_name' => $event?->slug,
            'is_active' => true,
            'created_by_user_id' => $request->user()?->id,
            'registration_consent_accepted_at' => now(),
            'password' => 'cers2026',
        ]);

        if (filled($participant->email)) {
            try {
                Log::info('Sending Brevo registration email from ParticipantsController.', [
                    'participant_id' => $participant->participant_id,
                    'email' => $participant->email,
                ]);

                $brevoEmailService->sendRegistrationSuccess([
                    'participant_id' => $participant->participant_id,
                    'name' => $participant->name,
                    'email' => $participant->email,
                    'organization' => $participant->organization,
                    'event_name' => $event?->name ?? $participant->event_name,
                ]);
            } catch (\Throwable $e) {
                Log::error('Brevo registration email failed from ParticipantsController.', [
                    'participant_id' => $participant->participant_id ?? null,
                    'email' => $participant->email ?? null,
                    'message' => $e->getMessage(),
                ]);
            }
        }

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
                'nullable',
                'string',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($participant),
            ],
            'phone' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'province' => [
                'nullable',
                'string',
                Rule::exists('provinces', 'code')->where('is_active', true),
            ],
            'municipality' => [
                'nullable',
                'string',
                Rule::exists('municipalities', 'code')->where('is_active', true),
            ],
            'organization' => [
                'required',
                'string',
                'max:255',
                Rule::exists('organizations', 'name')->where('is_active', true),
            ],
            'participant_type' => [
                'required',
                'string',
                Rule::exists('participant_types', 'slug')->where(
                    fn ($query) => $query
                        ->where('is_active', true)
                        ->where('event_id', Event::query()
                            ->where('slug', $request->input('event_name'))
                            ->value('id')),
                ),
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

        $provinceCode = $validated['province'] ?? null;
        $municipalityCode = $validated['municipality'] ?? null;

        unset($validated['province'], $validated['municipality']);

        if ($provinceCode) {
            $province = Province::query()
                ->where('code', $provinceCode)
                ->where('is_active', true)
                ->firstOrFail();

            $validated['province_id'] = $province->id;

            if ($municipalityCode) {
                $municipality = Municipality::query()
                    ->where('code', $municipalityCode)
                    ->where('province_id', $province->id)
                    ->where('is_active', true)
                    ->first();

                if (! $municipality) {
                    return back()
                        ->withErrors(['municipality' => 'The selected municipality must belong to the selected province.'])
                        ->withInput();
                }

                $validated['municipality_id'] = $municipality->id;
            } else {
                $validated['municipality_id'] = null;
            }
        } else {
            $validated['province_id'] = null;
            $validated['municipality_id'] = null;
        }

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

    public function destroy(Request $request, User $participant): RedirectResponse
    {
        $participant->update([
            'deleted_by_user_id' => $request->user()?->id,
        ]);

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

        if (strlen($contents) > 2 * 1024 * 1024 || getimagesizefromstring($contents) === false) {
            return null;
        }

        $extension = $matches[1] === 'png' ? 'png' : 'jpg';
        $path = 'profile-photos/'.Str::uuid().'.'.$extension;

        Storage::disk('public')->put($path, $contents);

        return Storage::url($path);
    }
}
