<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\Event;
use App\Models\Municipality;
use App\Models\Organization;
use App\Models\ParticipantType;
use App\Models\Province;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        $validator = Validator::make(
            $input,
            [
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
                    'required',
                    'string',
                    'max:255',
                ],
                'position' => ['nullable', 'string', 'max:255'],
                'participant_type' => [
                    'required',
                    'string',
                    'max:255',
                ],
                'sex' => ['required', 'string', 'in:male,female'],
                'event_name' => [
                    'required',
                    'string',
                    Rule::exists('events', 'slug')->where(fn ($query) => $query
                        ->where('is_active', true)
                        ->where('is_registration_closed', false)
                        ->whereNotNull('starts_at')
                        ->whereNotNull('ends_at')
                        ->where('ends_at', '>=', now())),
                ],
                'consent' => ['accepted'],
                'password' => $this->passwordRules(),
            ],
            [
                'email.unique' => 'This account is already registered.',
                'event_name.exists' => 'Registration for the selected event is closed.',
            ],
        );

        $validator->after(function ($validator) use ($input): void {
            if (empty($input['province']) || empty($input['municipality'])) {
                return;
            }

            $province = Province::query()
                ->where('code', $input['province'])
                ->where('is_active', true)
                ->first();

            if (! $province) {
                return;
            }

            $municipalityBelongsToProvince = Municipality::query()
                ->where('code', $input['municipality'])
                ->where('province_id', $province->id)
                ->where('is_active', true)
                ->exists();

            if (! $municipalityBelongsToProvince) {
                $validator->errors()->add('municipality', 'The selected municipality must belong to the selected province.');
            }
        });

        $validator->after(function ($validator) use ($input): void {
            if (empty($input['participant_type']) || empty($input['event_name'])) {
                return;
            }

            $participantTypeSlug = Str::slug($input['participant_type']);

            if ($participantTypeSlug === '') {
                $validator->errors()->add('participant_type', 'Enter a valid participant type.');

                return;
            }

            if (in_array($participantTypeSlug, ['admin', 'administrator'], true)) {
                $validator->errors()->add('participant_type', 'The selected participant type is invalid.');

                return;
            }

            $eventId = Event::query()
                ->where('slug', $input['event_name'])
                ->value('id');
            $participantType = ParticipantType::query()
                ->where('event_id', $eventId)
                ->where('slug', $participantTypeSlug)
                ->first();

            if (! $participantType || ! $participantType->is_active) {
                $validator->errors()->add('participant_type', 'The selected participant type is invalid.');
            }
        });

        $validator->validate();

        $avatar = $this->storeAvatar($input['avatar'] ?? null);

        $name = trim(collect([
            $input['given_name'],
            $input['middle_name'] ?? null,
            $input['surname'],
        ])->filter()->implode(' '));
        $organization = Organization::query()->firstOrCreate(
            ['slug' => Str::slug($input['organization'])],
            [
                'name' => $input['organization'],
                'type' => 'school',
                'is_active' => true,
            ],
        );
        $province = Province::query()
            ->where('code', $input['province'])
            ->where('is_active', true)
            ->firstOrFail();
        $municipality = Municipality::query()
            ->where('code', $input['municipality'])
            ->where('province_id', $province->id)
            ->where('is_active', true)
            ->firstOrFail();
        $event = Event::query()
            ->where('slug', $input['event_name'])
            ->where('is_active', true)
            ->where('is_registration_closed', false)
            ->whereNotNull('starts_at')
            ->whereNotNull('ends_at')
            ->where('ends_at', '>=', now())
            ->firstOrFail();
        $participantTypeSlug = Str::slug($input['participant_type']);
        $participantType = ParticipantType::query()
            ->where('event_id', $event->id)
            ->where('slug', $participantTypeSlug)
            ->where('is_active', true)
            ->firstOrFail();

        return User::create([
            'name' => $name,
            'participant_id' => $this->generateParticipantId(),
            'given_name' => $input['given_name'],
            'middle_name' => $input['middle_name'] ?? null,
            'surname' => $input['surname'],
            'email' => $input['email'] ?? null,
            'avatar' => $avatar,
            'phone' => $input['phone'] ?? null,
            'province_id' => $province->id,
            'municipality_id' => $municipality->id,
            'organization_id' => $organization->id,
            'organization' => $input['organization'],
            'position' => $input['position'] ?? null,
            'participant_type' => $participantType->slug,
            'sex' => $input['sex'],
            'event_id' => $event->id,
            'event_name' => $event->slug,
            'is_active' => true,
            'registration_consent_accepted_at' => now(),
            'password' => $input['password'],
        ]);
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
