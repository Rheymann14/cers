<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
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
        Validator::make($input, [
            'given_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'surname' => ['required', 'string', 'max:255'],
            'email' => $this->emailRules(),
            'avatar' => ['nullable', 'string'],
            'phone' => ['required', 'string', 'max:50'],
            'organization' => ['required', 'string', 'max:255'],
            'position' => ['nullable', 'string', 'max:255'],
            'participant_type' => ['required', 'string', 'in:student,faculty,staff,guest'],
            'sex' => ['required', 'string', 'in:male,female'],
            'event_name' => ['required', 'string', 'in:ched-regional-orientation,higher-education-summit,faculty-development-workshop'],
            'consent' => ['accepted'],
            'password' => $this->passwordRules(),
        ])->validate();

        $avatar = $this->storeAvatar($input['avatar'] ?? null);

        $name = trim(collect([
            $input['given_name'],
            $input['middle_name'] ?? null,
            $input['surname'],
        ])->filter()->implode(' '));

        return User::create([
            'name' => $name,
            'given_name' => $input['given_name'],
            'middle_name' => $input['middle_name'] ?? null,
            'surname' => $input['surname'],
            'email' => $input['email'],
            'avatar' => $avatar,
            'phone' => $input['phone'],
            'organization' => $input['organization'],
            'position' => $input['position'] ?? null,
            'participant_type' => $input['participant_type'],
            'sex' => $input['sex'],
            'event_name' => $input['event_name'],
            'registration_consent_accepted_at' => now(),
            'password' => $input['password'],
        ]);
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
