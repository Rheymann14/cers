<?php

namespace App\Providers;

use App\Socialite\AutherSpaceProvider;
use Illuminate\Auth\Events\Logout;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Laravel\Socialite\Contracts\Factory as Socialite;

class AutherSpaceServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->app->make(Socialite::class)->extend('auther-space', function ($app) {
            return $app->make(Socialite::class)->buildProvider(
                AutherSpaceProvider::class,
                $app['config']['services.auther_space'],
            );
        });

        // Fortify invalidates the session right after logging out, so keep the
        // ID token on the request for LogoutResponse to end the CHED XII session.
        Event::listen(Logout::class, function () {
            $request = $this->app->make('request');

            if ($request->hasSession() && $idToken = $request->session()->get('auther_space_id_token')) {
                $request->attributes->set('auther_space_id_token', $idToken);
            }
        });
    }
}
