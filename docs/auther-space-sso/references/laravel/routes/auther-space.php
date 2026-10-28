<?php

// Add these to routes/web.php.

use App\Http\Controllers\Auth\AutherSpaceController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    // `name('login')` makes the `auth` middleware send guests straight into SSO.
    Route::get('/auth/redirect', [AutherSpaceController::class, 'redirect'])->name('login');
    Route::get('/auth/callback', [AutherSpaceController::class, 'callback']);
});

Route::post('/logout', [AutherSpaceController::class, 'logout'])->middleware('auth')->name('logout');
