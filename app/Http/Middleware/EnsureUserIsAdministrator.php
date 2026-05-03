<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsAdministrator
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->isAdministrator()) {
            return $next($request);
        }

        abort_if($request->expectsJson(), 403);

        return redirect()->route('participant-profile.edit');
    }
}
