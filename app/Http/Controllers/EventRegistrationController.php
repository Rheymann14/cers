<?php

namespace App\Http\Controllers;

use App\Actions\Fortify\CreateNewUser;
use App\Services\BrevoEmailService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use App\Models\Event;

class EventRegistrationController extends Controller
{
    public function store(
        Request $request,
        CreateNewUser $creator,
        BrevoEmailService $brevoEmailService,
    ): RedirectResponse {
        $request->merge([
            'password' => 'cers2026',
            'password_confirmation' => 'cers2026',
        ]);

        $user = $creator->create($request->all());

        $eventName = Event::query()
            ->where('slug', $user->event_name)
            ->value('name') ?? $user->event_name;

        event(new Registered($user));

        if (filled($user->email)) {
            try {
                Log::info('Sending Brevo registration email from EventRegistrationController.', [
                    'participant_id' => $user->participant_id,
                    'email' => $user->email,
                ]);

                $brevoEmailService->sendRegistrationSuccess([
                    'participant_id' => $user->participant_id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'organization' => $user->organization,
                    'event_name' => $eventName,
                    'qr_token' => $user->qr_token,
                ]);
            } catch (\Throwable $e) {
                Log::error('Brevo registration email failed.', [
                    'participant_id' => $user->participant_id ?? null,
                    'email' => $user->email ?? null,
                    'message' => $e->getMessage(),
                ]);
            }
        }

        $request->session()->flash('toast', [
            'type' => 'success',
            'message' => 'Registration submitted successfully.',
        ]);

        $request->session()->flash('registration_success', [
            'participant_id' => $user->participant_id,
            'name' => $user->name,
            'email' => $user->email,
            'organization' => $user->organization,
            'avatar' => $user->avatar,
        ]);

        return redirect()->route($user->isAdministrator() ? 'dashboard' : 'home');
    }
}
