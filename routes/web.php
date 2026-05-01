<?php

use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Http\Controllers\RegisteredUserController;

Route::inertia('/', 'welcome')->name('home');

Route::post('event-registration', [RegisteredUserController::class, 'store'])
    ->middleware(['guest'])
    ->name('event-registration.store');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

require __DIR__.'/settings.php';
