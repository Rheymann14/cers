<?php

use App\Services\BrevoEmailService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('brevo:diagnose {email? : Optional recipient for a test email}', function () {
    $this->info('Brevo diagnostics');
    $this->line('APP_ENV: '.app()->environment());
    $this->line('BREVO_API_KEY configured: '.(filled(config('services.brevo.api_key')) ? 'yes' : 'no'));
    $this->line('BREVO_SENDER_EMAIL: '.(config('services.brevo.sender_email') ?: 'not set'));
    $this->line('BREVO_SENDER_NAME: '.(config('services.brevo.sender_name') ?: 'not set'));

    foreach ([
        'public_ip' => 'https://api.ipify.org?format=json',
        'ipv6_check' => 'https://api64.ipify.org?format=json',
    ] as $label => $url) {
        try {
            $response = Http::timeout(10)->acceptJson()->get($url);
            $ip = $response->json('ip');

            $this->line($label.': '.($ip ?: 'unavailable').' (HTTP '.$response->status().')');
        } catch (Throwable $e) {
            $this->line($label.': unavailable ('.$e->getMessage().')');
        }
    }

    $email = $this->argument('email');

    if (! $email) {
        $this->comment('Pass an email address to send a test message: php artisan brevo:diagnose user@example.com');

        return self::SUCCESS;
    }

    if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $this->error('The recipient must be a valid email address.');

        return self::FAILURE;
    }

    $sent = app(BrevoEmailService::class)->sendRegistrationSuccess([
        'participant_id' => 'CERS-DIAG-'.now()->format('YmdHis'),
        'name' => 'Brevo Diagnostic',
        'email' => $email,
        'organization' => 'CERS',
        'event_name' => 'Brevo Email Diagnostic',
    ]);

    if (! $sent) {
        $this->error('Brevo test email failed. Check storage/logs/laravel.log for the Brevo response body.');

        return self::FAILURE;
    }

    $this->info('Brevo test email accepted by the API.');

    return self::SUCCESS;
})->purpose('Show Brevo config, server outbound IP, and optionally send a test email');
