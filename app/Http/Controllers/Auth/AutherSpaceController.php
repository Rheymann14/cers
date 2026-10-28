<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Exception;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Laravel\Socialite\Facades\Socialite;

class AutherSpaceController extends Controller
{
    /**
     * Start CHED XII sign-in. This is also the login initiation URL that the
     * CHED XII systems directory opens from its "Launch" button.
     */
    public function redirect(): RedirectResponse
    {
        return Socialite::driver('auther-space')->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        if ($request->filled('error')) {
            return $this->failed($request->input('error') === 'access_denied'
                ? 'You do not have access to CERS.'
                : 'CHED XII sign-in was not completed. Please try again.');
        }

        try {
            $remote = Socialite::driver('auther-space')->user();
        } catch (Exception $e) {
            report($e);

            return $this->failed('CHED XII sign-in could not be verified. Please try again.');
        }

        $user = $this->resolveUser($remote);

        if (! $user) {
            return $this->failed('You do not have access to CERS.');
        }

        Auth::login($user);
        $request->session()->regenerate();

        // Keep the ID token for ending the CHED XII session on logout.
        $request->session()->put('auther_space_id_token', $remote->getRaw()['id_token']);

        return redirect()->intended(route('dashboard', absolute: false));
    }

    /**
     * Find the CERS administrator account for a CHED XII user, linking it on
     * first sign-in. Returns null when the user may not access CERS.
     *
     * Roles belong to each system, so CHED XII never grants a CERS role:
     * administrators are created with `make:admin` or promoted in CERS.
     */
    private function resolveUser(SocialiteUser $remote): ?User
    {
        $email = $remote->getEmail() ? Str::lower($remote->getEmail()) : null;
        $emailVerified = ($remote->getRaw()['email_verified'] ?? false) === true;

        // 1. Returning user: `sub` is the only stable identifier.
        $user = User::withTrashed()->where('auther_sub', $remote->getId())->first();

        // 2. First CHED XII sign-in: link the CERS account with the same
        //    verified email, if that account has not been linked yet.
        if (! $user && $emailVerified && $email) {
            $user = User::withTrashed()
                ->where('email', $email)
                ->whereNull('auther_sub')
                ->first();
        }

        if (! $user || $user->trashed() || ! $user->is_active || ! $user->isAdministrator()) {
            return null;
        }

        if ($user->auther_sub === null) {
            $user->forceFill(['auther_sub' => $remote->getId()])->save();
        }

        return $user;
    }

    private function failed(string $message): RedirectResponse
    {
        return redirect()->route('login')->withErrors(['sso' => $message]);
    }
}
