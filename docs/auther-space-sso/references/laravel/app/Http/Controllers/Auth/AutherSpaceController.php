<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;

class AutherSpaceController extends Controller
{
    /** Start SSO. Also used as the system's "login initiation URL" for the Chedro 12 portal. */
    public function redirect(): RedirectResponse
    {
        return Socialite::driver('auther-space')->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        try {
            $remote = Socialite::driver('auther-space')->user();
        } catch (InvalidStateException $e) {
            report($e);

            return redirect('/')->with('error', 'Sign-in could not be verified. Please try again.');
        }

        $claims = $remote->getRaw()['id_token_claims'];

        $user = DB::transaction(function () use ($remote) {
            // 1. Returning user: the stable `sub` is the only reliable identifier.
            $user = User::where('auther_sub', $remote->getId())->first();

            // 2. First SSO login for an existing local account: link by *verified* email.
            if (! $user && ($remote->getRaw()['email_verified'] ?? false) && $remote->getEmail()) {
                $user = User::where('email', $remote->getEmail())->whereNull('auther_sub')->first();
            }

            // 3. Brand-new user: provision a local account automatically.
            $user ??= new User;

            $user->forceFill([
                'auther_sub' => $remote->getId(),
                'name' => $remote->getName() ?? $remote->getEmail(),
                'email' => $remote->getEmail(),
            ])->save();

            return $user;
        });

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        // Keep the ID token for RP-initiated logout.
        $request->session()->put('auther_space_id_token', $remote->getRaw()['id_token']);
        $request->session()->put('auther_space_auth_time', $claims['auth_time'] ?? null);

        return redirect()->intended('/dashboard');
    }

    /** Sign out locally, then end the Auther Space SSO session. */
    public function logout(Request $request): RedirectResponse
    {
        $idToken = $request->session()->get('auther_space_id_token');

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->away(
            Socialite::driver('auther-space')->logoutUrl($idToken, config('services.auther_space.post_logout_redirect'))
        );
    }
}
