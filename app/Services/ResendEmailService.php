<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ResendEmailService
{
    public function sendRegistrationSuccess(array $participant): bool
    {
        $apiKey = config('services.resend.key');
        $fromEmail = config('services.resend.from_email');

        if (! $apiKey || ! $fromEmail) {
            Log::warning('Resend is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.');

            return false;
        }

        $participant['organization'] = $participant['organization'] ?? '';

        $participant['qr_token'] = $participant['qr_token'] ?? $this->createQrToken(
            email: $participant['email'],
            fullName: $participant['name'],
            participantId: $participant['participant_id'],
        );

        $participant['qr_image_url'] = 'https://quickchart.io/qr?size=180&margin=1&text='.urlencode($participant['qr_token']);

        $participant['initials'] = $this->getInitials($participant['name']);

        $fromName = str_replace(['"', '<', '>'], '', (string) config('services.resend.from_name'));

        $response = Http::withToken($apiKey)
            ->acceptJson()
            ->timeout(20)
            ->post('https://api.resend.com/emails', [
                'from' => $fromName !== '' ? sprintf('%s <%s>', $fromName, $fromEmail) : $fromEmail,
                'to' => [$participant['email']],
                'subject' => 'Registration Successful - CHED Events Registration System',
                'html' => view('emails.registration-success', [
                    'participant' => $participant,
                ])->render(),
            ]);

        Log::info('Resend email response.', [
            'status' => $response->status(),
            'body' => $response->body(),
        ]);

        if ($response->failed()) {
            Log::error('Resend email sending failed.', [
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
        string $participantId,
    ): string {
        $fingerprint = $this->hashString(
            collect([
                'CERS-VIRTUAL-ID',
                $participantId,
                $fullName,
                $email,
            ])
                ->map(fn ($value) => trim(strtolower($value)))
                ->implode('|')
        );

        return 'CERS:VID:2:'.$fingerprint;
    }

    private function hashString(string $value): string
    {
        $high = 0x811C;
        $low = 0x9DC5;
        $utf16 = mb_convert_encoding($value, 'UTF-16LE', 'UTF-8');
        $codeUnits = unpack('v*', $utf16) ?: [];

        foreach ($codeUnits as $codeUnit) {
            $low ^= $codeUnit;

            $oldLow = $low;
            $lowProduct = $oldLow * 0x0193;
            $carry = intdiv($lowProduct, 0x10000);
            $low = $lowProduct % 0x10000;
            $high = (($high * 0x0193) + ($oldLow * 0x0100) + $carry) % 0x10000;
        }

        return $this->base36FromUint32($high, $low);
    }

    private function base36FromUint32(int $high, int $low): string
    {
        $alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $digits = '';

        do {
            $quotientHigh = intdiv($high, 36);
            $remainderHigh = $high % 36;
            $combined = ($remainderHigh * 0x10000) + $low;
            $quotientLow = intdiv($combined, 36);
            $remainder = $combined % 36;

            $digits = $alphabet[$remainder].$digits;
            $high = $quotientHigh;
            $low = $quotientLow;
        } while ($high > 0 || $low > 0);

        return $digits;
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
