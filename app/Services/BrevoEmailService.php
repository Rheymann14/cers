<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BrevoEmailService
{
    public function sendRegistrationSuccess(array $participant): bool
    {
        $apiKey = config('services.brevo.api_key');

        if (!$apiKey) {
            Log::warning('Brevo API key is missing.');
            return false;
        }

        $response = Http::withHeaders([
            'api-key' => $apiKey,
            'accept' => 'application/json',
            'content-type' => 'application/json',
        ])->post('https://api.brevo.com/v3/smtp/email', [
            'sender' => [
                'name' => config('services.brevo.sender_name'),
                'email' => config('services.brevo.sender_email'),
            ],
            'to' => [
                [
                    'email' => $participant['email'],
                    'name' => $participant['name'],
                ],
            ],
            'subject' => 'Registration Successful - CHED Events Registration System',
            'htmlContent' => view('emails.registration-success', [
                'participant' => $participant,
            ])->render(),
        ]);

        if ($response->failed()) {
            Log::error('Brevo email sending failed.', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return false;
        }

        return true;
    }
}