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

        $participant['organization'] = $participant['organization'] ?? '';

        $participant['qr_token'] = $participant['qr_token'] ?? $this->createQrToken(
            email: $participant['email'],
            fullName: $participant['name'],
            organization: $participant['organization'],
            participantId: $participant['participant_id'],
        );

        $participant['qr_image_url'] = 'https://quickchart.io/qr?size=180&margin=1&text=' . urlencode($participant['qr_token']);

        $participant['initials'] = $this->getInitials($participant['name']);

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

        Log::info('Brevo email response.', [
            'status' => $response->status(),
            'body' => $response->body(),
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

    private function createQrToken(
        string $email,
        string $fullName,
        string $organization,
        string $participantId,
    ): string {
        $fingerprint = $this->hashString(
            collect([
                'CERS-VIRTUAL-ID',
                $participantId,
                $fullName,
                $email,
                $organization,
            ])
                ->map(fn ($value) => trim(strtolower($value)))
                ->implode('|')
        );

        return 'CERS:VID:1:' . $fingerprint;
    }

    private function hashString(string $value): string
    {
        $hash = 2166136261;

        $length = strlen($value);

        for ($i = 0; $i < $length; $i++) {
            $hash ^= ord($value[$i]);
            $hash = ($hash * 16777619) & 0xffffffff;
        }

        return strtoupper(base_convert((string) $hash, 10, 36));
    }

    private function getInitials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name));

        $initials = collect($parts)
            ->filter()
            ->map(fn ($part) => mb_substr($part, 0, 1))
            ->implode('');

        return strtoupper(mb_substr($initials ?: 'ID', 0, 2));
    }
}