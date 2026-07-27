<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventAttendance;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceQrScannerController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('attendance_qr_scanner', [
            'events' => Event::query()
                ->withCount(['registrations as users_count'])
                ->orderBy('starts_at')
                ->orderBy('name')
                ->get([
                    'id',
                    'name',
                    'slug',
                    'starts_at',
                    'ends_at',
                    'is_active',
                ]),
        ]);
    }

    public function checkIn(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'event_id' => ['required', 'integer', Rule::exists('events', 'id')],
            'attendance_date' => ['required', 'date_format:Y-m-d'],
            'mode' => ['required', Rule::in(['qr', 'manual'])],
            'value' => ['required', 'string', 'max:255'],
        ]);

        $event = Event::query()->findOrFail($validated['event_id']);

        if ($this->isClosedEvent($event)) {
            return response()->json([
                'message' => 'Selected event is closed and cannot accept attendance check-ins.',
            ], 422);
        }

        $attendanceDate = Carbon::createFromFormat('Y-m-d', $validated['attendance_date'])
            ->startOfDay();
        $eventStartsOn = $event->starts_at?->copy()->startOfDay();
        $eventEndsOn = ($event->ends_at ?? $event->starts_at)?->copy()->startOfDay();

        if (
            ! $eventStartsOn
            || ! $eventEndsOn
            || $attendanceDate->lt($eventStartsOn)
            || $attendanceDate->gt($eventEndsOn)
        ) {
            return response()->json([
                'message' => 'The attendance date must be one of the selected event dates.',
            ], 422);
        }

        if ($validated['mode'] === 'qr' && ! $this->isCersVirtualIdToken($validated['value'])) {
            return response()->json([
                'message' => 'Only CERS virtual ID QR codes can be scanned.',
            ], 422);
        }

        $participant = $validated['mode'] === 'qr'
            ? $this->findParticipantByQrToken($validated['value'])
            : User::query()
                ->where('participant_id', mb_strtoupper(trim($validated['value'])))
                ->first();

        if (! $participant) {
            return response()->json([
                'message' => $validated['mode'] === 'qr'
                    ? 'This CERS QR code is not registered in the system.'
                    : 'No participant found for that Participant ID.',
            ], 422);
        }

        if (! $participant->is_active) {
            return response()->json([
                'message' => 'This participant account is inactive.',
            ], 422);
        }

        $registration = $participant->eventRegistrations()
            ->where('event_id', $event->id)
            ->first();

        if (! $registration) {
            return response()->json([
                'message' => 'This participant is not registered for the selected event.',
            ], 422);
        }

        $attendance = EventAttendance::query()->firstOrCreate(
            [
                'event_id' => $event->id,
                'user_id' => $participant->id,
                'attendance_date' => $attendanceDate,
            ],
            [
                'checked_in_by_user_id' => $request->user()?->id,
                'checked_in_at' => now(),
            ],
        );

        return response()->json([
            'message' => $attendance->wasRecentlyCreated
                ? 'Attendance check-in recorded.'
                : 'Participant was already checked in.',
            'already_checked_in' => ! $attendance->wasRecentlyCreated,
            'checked_in_at' => $attendance->checked_in_at?->toIso8601String(),
            'attendance_date' => $attendance->attendance_date?->toDateString(),
            'participant' => [
                'id' => $participant->id,
                'participant_id' => $participant->participant_id,
                'name' => $participant->name,
                'email' => $participant->email,
                'avatar' => $participant->avatar,
                'organization' => $registration->organization,
                'qr_token' => $this->createQrToken($participant),
            ],
            'event' => [
                'id' => $event->id,
                'name' => $event->name,
            ],
        ]);
    }

    private function findParticipantByQrToken(string $qrToken): ?User
    {
        $qrToken = trim($qrToken);

        if (! $this->isCersVirtualIdToken($qrToken)) {
            return null;
        }

        return User::query()
            ->whereNotNull('participant_id')
            ->whereNull('deleted_at')
            ->get(['id', 'participant_id', 'name', 'email', 'avatar', 'organization', 'is_active'])
            ->first(fn (User $participant) => hash_equals($this->createQrToken($participant), $qrToken)
                || hash_equals($this->createLegacyQrToken($participant), $qrToken));
    }

    private function isClosedEvent(Event $event): bool
    {
        return ! $event->is_active || ($event->ends_at && now()->greaterThan($event->ends_at));
    }

    private function isCersVirtualIdToken(string $qrToken): bool
    {
        return str_starts_with(trim($qrToken), 'CERS:VID:1:')
            || str_starts_with(trim($qrToken), 'CERS:VID:2:');
    }

    private function createQrToken(User $participant): string
    {
        $fingerprint = $this->hashString(collect([
            'CERS-VIRTUAL-ID',
            (string) $participant->participant_id,
            (string) ($participant->name ?: 'Participant'),
            (string) $participant->email,
        ])->map(fn (string $value) => trim(mb_strtolower($value)))->implode('|'));

        return 'CERS:VID:2:'.$fingerprint;
    }

    private function createLegacyQrToken(User $participant): string
    {
        $fingerprint = $this->hashString(collect([
            'CERS-VIRTUAL-ID',
            (string) $participant->participant_id,
            (string) ($participant->name ?: 'Participant'),
            (string) $participant->email,
            (string) $participant->organization,
        ])->map(fn (string $value) => trim(mb_strtolower($value)))->implode('|'));

        return 'CERS:VID:1:'.$fingerprint;
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
}
