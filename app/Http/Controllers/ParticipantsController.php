<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventAttendance;
use App\Models\EventRegistration;
use App\Models\Municipality;
use App\Models\Organization;
use App\Models\ParticipantType;
use App\Models\Province;
use App\Models\User;
use App\Services\BrevoEmailService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
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
    public function __invoke(Request $request): Response
    {
        $perPage = max(5, min(100, $request->integer('per_page', 10)));

        return Inertia::render('participants', [
            'participants' => $this->participantQuery($request)
                ->paginate($perPage)
                ->withQueryString(),
            'deletedParticipants' => Inertia::optional(
                fn () => $this->participantQuery($request, true)
                    ->latest('deleted_at')
                    ->get($this->participantColumns()),
            ),
            'deletedParticipantsCount' => User::query()
                ->onlyTrashed()
                ->when(
                    $request->string('event', 'all')->toString() !== 'all',
                    fn (Builder $query) => $query->whereHas(
                        'eventRegistrations.event',
                        fn (Builder $query) => $query->where(
                            'slug',
                            $request->string('event')->toString(),
                        ),
                    ),
                )
                ->count(),
            'filters' => [
                'search' => $request->string('search')->toString(),
                'event' => $request->string('event', 'all')->toString(),
                'added_by' => $request->string('added_by', 'all')->toString(),
                'type' => $request->string('type', 'all')->toString(),
                'sort' => $request->string('sort', 'created_at')->toString(),
                'direction' => $request->string('direction', 'desc')->toString(),
                'per_page' => $perPage,
            ],
            'organizations' => Organization::query()
                ->leftJoin('events', 'events.id', '=', 'organizations.event_id')
                ->where('organizations.is_active', true)
                ->orderBy('organizations.type')
                ->orderBy('organizations.name')
                ->get([
                    'organizations.name as value',
                    'organizations.name as label',
                    'organizations.type',
                    'events.slug as event_slug',
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
                EventRegistration::query()
                    ->join('users', 'users.id', '=', 'event_registrations.user_id')
                    ->join('events', 'events.id', '=', 'event_registrations.event_id')
                    ->whereIn('event_registrations.participant_type', ['admin', 'administrator'])
                    ->where('users.is_active', true)
                    ->whereNull('users.deleted_at')
                    ->orderBy('users.name')
                    ->get([
                        'users.id as user_id',
                        'users.name',
                        'events.slug as event_slug',
                    ])
                    ->map(fn (EventRegistration $registration) => [
                        'value' => 'admin:'.$registration->user_id,
                        'label' => $registration->name,
                        'type' => 'administrator',
                        'event_slug' => $registration->event_slug,
                    ]),
            )->values(),
            'provinces' => Province::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['code as value', 'name as label']),
        ]);
    }

    public function export(Request $request): JsonResponse
    {
        return response()->json(
            $this->participantQuery($request)
                ->get($this->participantColumns()),
        );
    }

    private function participantQuery(Request $request, bool $trashed = false): Builder
    {
        $query = User::query()
            ->when($trashed, fn (Builder $query) => $query->onlyTrashed())
            ->with([
                'province:id,code,name',
                'municipality:id,code,name',
                'createdBy:id,name',
                'deletedBy:id,name',
                'eventRegistrations:id,user_id,event_id,organization,participant_type,created_by_user_id,created_at',
                'eventRegistrations.event:id,slug',
                'eventRegistrations.createdBy:id,name',
            ]);
        $event = $request->string('event', 'all')->toString();
        $type = $request->string('type', 'all')->toString();
        $addedBy = $request->string('added_by', 'all')->toString();
        $search = trim($request->string('search')->toString());

        if ($event !== 'all') {
            $query->whereHas('eventRegistrations.event', fn (Builder $query) => $query->where('slug', $event));
        }

        if ($type !== 'all') {
            $query->whereHas('eventRegistrations', function (Builder $query) use ($event, $type) {
                $query->where('participant_type', $type)
                    ->when(
                        $event !== 'all',
                        fn (Builder $query) => $query->whereHas(
                            'event',
                            fn (Builder $query) => $query->where('slug', $event),
                        ),
                    );
            });
        }

        if ($addedBy === 'system') {
            $query->whereNull('created_by_user_id');
        } elseif (str_starts_with($addedBy, 'admin:')) {
            $query->where(function (Builder $query) use ($addedBy) {
                $creatorId = (int) Str::after($addedBy, 'admin:');
                $query->where('created_by_user_id', $creatorId)
                    ->orWhereHas(
                        'eventRegistrations',
                        fn (Builder $query) => $query->where('created_by_user_id', $creatorId),
                    );
            });
        }

        if ($search !== '') {
            $query->where(function (Builder $query) use ($search) {
                $like = '%'.$search.'%';
                $query->where('name', 'like', $like)
                    ->orWhere('participant_id', 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->orWhere('phone', 'like', $like)
                    ->orWhere('organization', 'like', $like)
                    ->orWhere('participant_type', 'like', $like)
                    ->orWhereHas('province', fn (Builder $query) => $query->where('name', 'like', $like))
                    ->orWhereHas('municipality', fn (Builder $query) => $query->where('name', 'like', $like))
                    ->orWhereHas('eventRegistrations', fn (Builder $query) => $query
                        ->where('organization', 'like', $like)
                        ->orWhere('participant_type', 'like', $like));
            });
        }

        $sort = $request->string('sort', 'created_at')->toString();
        $direction = $request->string('direction', 'desc')->toString() === 'asc' ? 'asc' : 'desc';
        $sortableColumns = [
            'name' => 'name',
            'email' => 'email',
            'sex' => 'sex',
            'created_at' => 'created_at',
            'organization' => 'organization',
            'participant_type' => 'participant_type',
            'event_name' => 'event_name',
        ];

        return $query
            ->orderBy($sortableColumns[$sort] ?? 'created_at', $direction)
            ->orderBy('id', $direction);
    }

    private function participantColumns(): array
    {
        return [
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
    }

    public function store(Request $request, BrevoEmailService $brevoEmailService): RedirectResponse
    {
        $validated = $request->validate([
            'given_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'surname' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
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
                Rule::exists('organizations', 'name')->where(
                    fn ($query) => $query
                        ->where('is_active', true)
                        ->where(fn ($query) => $query
                            ->whereNull('event_id')
                            ->orWhere('event_id', Event::query()
                                ->where('slug', $request->input('event_name'))
                                ->value('id'))),
                ),
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
                Rule::exists('events', 'slug')->where('is_active', true),
            ],
            'check_in' => ['boolean'],
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
        $event = isset($validated['event_name'])
            ? Event::query()
                ->where('slug', $validated['event_name'])
                ->where('is_active', true)
                ->first()
            : null;
        $organization = null;

        if (isset($validated['organization']) && $event) {
            $organizationSlug = str($validated['organization'])->slug()->toString();
            $organization = Organization::query()
                ->where('slug', $organizationSlug)
                ->where('is_active', true)
                ->where(fn ($query) => $query
                    ->whereNull('event_id')
                    ->orWhere('event_id', $event->id))
                ->orderByRaw('event_id is null desc')
                ->first();

            $organization ??= Organization::query()->create([
                'event_id' => $event->id,
                'slug' => $organizationSlug,
                'name' => $validated['organization'],
                'type' => 'school',
                'is_active' => true,
            ]);
        }

        if (
            ($validated['check_in'] ?? false)
            && (! $event || ($event->ends_at && now()->greaterThan($event->ends_at)))
        ) {
            return back()
                ->withErrors([
                    'check_in' => 'The selected event is closed and cannot accept attendance check-ins.',
                ])
                ->withInput();
        }

        $email = filled($validated['email'] ?? null)
            ? mb_strtolower(trim($validated['email']))
            : null;
        $participant = $email
            ? User::query()->whereRaw('LOWER(email) = ?', [$email])->first()
            : null;

        if (
            $participant
            && EventRegistration::query()
                ->where('user_id', $participant->id)
                ->where('event_id', $event?->id)
                ->exists()
        ) {
            return back()
                ->withErrors(['email' => 'This account is already registered for the selected event.'])
                ->withInput();
        }

        $participant ??= User::query()->create([
            'name' => $name,
            'participant_id' => $this->generateParticipantId(),
            'given_name' => $validated['given_name'],
            'middle_name' => $validated['middle_name'] ?? null,
            'surname' => $validated['surname'],
            'email' => $email,
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

        $registration = EventRegistration::query()->create([
            'user_id' => $participant->id,
            'event_id' => $event->id,
            'organization_id' => $organization?->id,
            'organization' => $validated['organization'] ?? null,
            'participant_type' => $validated['participant_type'],
            'created_by_user_id' => $request->user()?->id,
            'registration_consent_accepted_at' => now(),
        ]);

        if ($validated['check_in'] ?? false) {
            EventAttendance::query()->create([
                'event_id' => $event->id,
                'user_id' => $participant->id,
                'attendance_date' => now(
                    config('app.attendance_timezone', 'Asia/Manila'),
                )->toDateString(),
                'checked_in_by_user_id' => $request->user()?->id,
                'checked_in_at' => now(),
            ]);
        }

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
                    'organization' => $registration->organization,
                    'event_name' => $event->name,
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
            'message' => ($validated['check_in'] ?? false)
                ? 'Participant added and checked in successfully.'
                : 'Participant added successfully.',
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
                Rule::exists('organizations', 'name')->where(
                    fn ($query) => $query
                        ->where('is_active', true)
                        ->where(fn ($query) => $query
                            ->whereNull('event_id')
                            ->orWhere('event_id', Event::query()
                                ->where('slug', $request->input('event_name'))
                                ->value('id'))),
                ),
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
            'original_event_name' => [
                'nullable',
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

        $event = Event::query()
            ->where('slug', $validated['event_name'])
            ->firstOrFail();
        $organizationSlug = str($validated['organization'])->slug()->toString();
        $organization = Organization::query()
            ->where('slug', $organizationSlug)
            ->where('is_active', true)
            ->where(fn ($query) => $query
                ->whereNull('event_id')
                ->orWhere('event_id', $event->id))
            ->orderByRaw('event_id is null desc')
            ->first();

        $organization ??= Organization::query()->create([
            'event_id' => $event->id,
            'slug' => $organizationSlug,
            'name' => $validated['organization'],
            'type' => 'school',
            'is_active' => true,
        ]);
        $validated['organization_id'] = $organization->id;
        $validated['event_id'] = $event->id;
        $validated['event_name'] = $event->slug;

        $originalEventId = filled($validated['original_event_name'] ?? null)
            ? Event::query()
                ->where('slug', $validated['original_event_name'])
                ->value('id')
            : $participant->event_id;
        $registration = $participant->eventRegistrations()
            ->where('event_id', $originalEventId)
            ->first();
        $registrationWasPrimary = $registration
            && (int) $registration->event_id === (int) $participant->event_id;

        if (
            $registration
            && (int) $registration->event_id !== (int) $event->id
            && $participant->eventRegistrations()
                ->where('event_id', $event->id)
                ->whereKeyNot($registration->id)
                ->exists()
        ) {
            return back()
                ->withErrors(['event_name' => 'This participant is already registered for the selected event.'])
                ->withInput();
        }

        $registration?->update([
            'event_id' => $event->id,
            'organization_id' => $organization->id,
            'organization' => $validated['organization'],
            'participant_type' => $validated['participant_type'],
        ]);

        unset($validated['original_event_name']);

        if ($registration && ! $registrationWasPrimary) {
            unset(
                $validated['organization_id'],
                $validated['organization'],
                $validated['participant_type'],
                $validated['event_id'],
                $validated['event_name'],
            );
        }

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
