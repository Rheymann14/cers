<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class MakeAdmin extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'make:admin
        {--name= : The administrator name}
        {--email= : The administrator email address}
        {--password= : The administrator password}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create a CHED administrator account';

    public function handle(): int
    {
        $name = trim((string) ($this->option('name') ?: $this->ask('Name')));
        $email = trim((string) ($this->option('email') ?: $this->ask('Email address')));
        $password = (string) ($this->option('password') ?: $this->secret('Password'));

        $validator = Validator::make(
            compact('name', 'email', 'password'),
            [
                'name' => ['required', 'string', 'max:255'],
                'email' => [
                    'required',
                    'string',
                    'email',
                    'max:255',
                    Rule::unique(User::class, 'email'),
                ],
                'password' => ['required', 'string', 'min:8'],
            ],
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $nameParts = preg_split('/\s+/', $name) ?: [$name];
        $givenName = array_shift($nameParts);
        $surname = $nameParts === [] ? null : array_pop($nameParts);
        $middleName = $nameParts === [] ? null : implode(' ', $nameParts);

        $admin = User::query()->create([
            'name' => $name,
            'participant_id' => $this->generateParticipantId(),
            'given_name' => $givenName,
            'middle_name' => $middleName,
            'surname' => $surname,
            'email' => $email,
            'organization' => 'Commission on Higher Education',
            'participant_type' => 'admin',
            'is_active' => true,
            'password' => $password,
        ]);
        $admin->forceFill(['email_verified_at' => now()])->save();

        $this->newLine();
        $this->info('Administrator account created successfully.');
        $this->table(
            ['Name', 'Email', 'Participant ID'],
            [[$admin->name, $admin->email, $admin->participant_id]],
        );

        return self::SUCCESS;
    }

    private function generateParticipantId(): string
    {
        do {
            $participantId = 'CERS-'.Str::upper(Str::random(4)).'-'.now()->year;
        } while (User::query()->where('participant_id', $participantId)->exists());

        return $participantId;
    }
}
