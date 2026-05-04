<?php

namespace App\Http\Controllers;

use App\Actions\Fortify\CreateNewUser;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EventRegistrationController extends Controller
{
    public function store(
        Request $request,
        CreateNewUser $creator,
    ): RedirectResponse {
        $user = $creator->create($request->all());

        event(new Registered($user));

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
