<?php

use App\Http\Controllers\EventRegistrationController;
use App\Http\Controllers\ParticipantsController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');
Route::inertia('/home', 'welcome');
Route::inertia('/registration', 'welcome')->name('registration');
Route::inertia('/features', 'welcome');

Route::post('event-registration', [EventRegistrationController::class, 'store'])
    ->middleware(['guest'])
    ->name('event-registration.store');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('participants', ParticipantsController::class)->name('participants');
    Route::patch('participants/{participant}', [ParticipantsController::class, 'update'])
        ->name('participants.update');
    Route::delete('participants/{participant}', [ParticipantsController::class, 'destroy'])
        ->name('participants.destroy');
    Route::post('participants/{participant}/password-reset', [ParticipantsController::class, 'resetPassword'])
        ->name('participants.password-reset');
    Route::patch('participants/{participant}/restore', [ParticipantsController::class, 'restore'])
        ->name('participants.restore');
});

require __DIR__.'/settings.php';
