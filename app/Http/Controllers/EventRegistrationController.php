<?php

namespace App\Http\Controllers;

use App\Actions\Fortify\CreateNewUser;
use Illuminate\Auth\Events\Registered;
use Illuminate\Contracts\Auth\StatefulGuard;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EventRegistrationController extends Controller
{
    public function store(
        Request $request,
        CreateNewUser $creator,
        StatefulGuard $guard,
    ): RedirectResponse {
        $user = $creator->create($request->all());

        event(new Registered($user));

        $guard->login($user, $request->boolean('remember'));

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Registration submitted successfully.',
        ]);

        return redirect()->route('participants');
    }
}
