<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Laravel\Fortify\Contracts\LogoutResponse as LogoutResponseContract;
use Laravel\Fortify\Fortify;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\Response;

class LogoutResponse implements LogoutResponseContract
{
    /**
     * Create an HTTP response that represents the object.
     *
     * @param  Request  $request
     * @return Response
     */
    public function toResponse($request)
    {
        if ($request->wantsJson()) {
            return new JsonResponse('', 204);
        }

        $idToken = $request->attributes->get('auther_space_id_token');

        if (! $idToken) {
            return redirect(Fortify::redirects('logout', '/'));
        }

        // Signed in with CHED XII: end the SSO session as well.
        return Inertia::location(
            Socialite::driver('auther-space')->logoutUrl(
                $idToken,
                config('services.auther_space.post_logout_redirect'),
            ),
        );
    }
}
