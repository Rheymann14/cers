<?php

use App\Services\ResendEmailService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('resend:diagnose {email? : Optional recipient for a test email}', function () {
    $this->info('Resend diagnostics');
    $this->line('APP_ENV: '.app()->environment());
    $this->line('RESEND_API_KEY configured: '.(filled(config('services.resend.key')) ? 'yes' : 'no'));
    $this->line('RESEND_FROM_EMAIL: '.(config('services.resend.from_email') ?: 'not set'));
    $this->line('RESEND_FROM_NAME: '.(config('services.resend.from_name') ?: 'not set'));

    $email = $this->argument('email');

    if (! $email) {
        $this->comment('Pass an email address to send a test message: php artisan resend:diagnose user@example.com');

        return self::SUCCESS;
    }

    if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $this->error('The recipient must be a valid email address.');

        return self::FAILURE;
    }

    $sent = app(ResendEmailService::class)->sendRegistrationSuccess([
        'participant_id' => 'CERS-DIAG-'.now()->format('YmdHis'),
        'name' => 'Resend Diagnostic',
        'email' => $email,
        'organization' => 'CERS',
        'event_name' => 'Resend Email Diagnostic',
    ]);

    if (! $sent) {
        $this->error('Resend test email failed. Check storage/logs/laravel.log for the Resend response body.');

        return self::FAILURE;
    }

    $this->info('Resend test email accepted by the API. The email id is in storage/logs/laravel.log.');

    return self::SUCCESS;
})->purpose('Show Resend config and optionally send a test email');

Artisan::command('resend:status {id : The email id returned by Resend}', function () {
    $apiKey = config('services.resend.key');

    if (! $apiKey) {
        $this->error('RESEND_API_KEY is not configured.');

        return self::FAILURE;
    }

    $response = Http::withToken($apiKey)
        ->acceptJson()
        ->timeout(20)
        ->get('https://api.resend.com/emails/'.rawurlencode($this->argument('id')));

    if ($response->failed()) {
        $this->error('Unable to fetch the Resend email. HTTP '.$response->status());
        $this->line($response->body());

        return self::FAILURE;
    }

    $this->table(
        ['Field', 'Value'],
        collect(['id', 'to', 'from', 'subject', 'last_event', 'created_at'])
            ->map(fn (string $key) => [
                $key,
                is_array($value = $response->json($key)) ? implode(', ', $value) : (string) $value,
            ])
            ->all(),
    );

    return self::SUCCESS;
})->purpose('Show the delivery status of one Resend email');
