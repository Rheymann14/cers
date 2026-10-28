<?php

namespace App\Providers;

use App\Socialite\AutherSpaceProvider;
use Illuminate\Support\ServiceProvider;
use Laravel\Socialite\Contracts\Factory as Socialite;

/** Registers the `auther-space` Socialite driver. Add to bootstrap/providers.php. */
class AutherSpaceServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->app->make(Socialite::class)->extend('auther-space', function ($app) {
            return $app->make(Socialite::class)->buildProvider(
                AutherSpaceProvider::class,
                $app['config']['services.auther_space'],
            );
        });
    }
}
