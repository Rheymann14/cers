<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
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
            'phone' => ['required', 'string', 'max:50'],
            'organization' => ['required', 'string', 'max:255'],
            'position' => ['nullable', 'string', 'max:255'],
            'participant_type' => ['required', 'string', 'in:student,faculty,staff,guest'],
            'sex' => ['required', 'string', 'in:male,female'],
            'event_name' => ['required', 'string', 'in:ched-regional-orientation,higher-education-summit,faculty-development-workshop'],
            'consent' => ['accepted'],
            'password' => $this->passwordRules(),
        ])->validate();

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
}
