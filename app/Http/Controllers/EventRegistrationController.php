<?php

namespace App\Http\Controllers;

use App\Actions\Fortify\CreateNewUser;
use App\Services\BrevoEmailService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class EventRegistrationController extends Controller
{
    public function store(
        Request $request,
        CreateNewUser $creator,
        BrevoEmailService $brevoEmailService,
    ): RedirectResponse {
        $user = $creator->create($request->all());

        event(new Registered($user));

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
                'event_name' => $user->event_name,
                'qr_token' => $user->qr_token,
            ]);
        } catch (\Throwable $e) {
            Log::error('Brevo registration email failed.', [
                'participant_id' => $user->participant_id ?? null,
                'email' => $user->email ?? null,
                'message' => $e->getMessage(),
            ]);
        }

        Inertia::flash('toast', [
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