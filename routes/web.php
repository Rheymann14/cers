<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EventRegistrationController;
use App\Http\Controllers\EventsManagementController;
use App\Http\Controllers\PageSettingsController;
use App\Http\Controllers\ParticipantProfileController;
use App\Http\Controllers\ParticipantsController;
use App\Http\Controllers\WelcomeController;
use App\Http\Controllers\WelcomeLookupController;
use Illuminate\Support\Facades\Route;

Route::get('/', WelcomeController::class)->name('home');
Route::get('/home', WelcomeController::class);
Route::get('/registration', WelcomeController::class)->name('registration');
Route::get('/features', WelcomeController::class);
Route::get('/welcome-lookups', [WelcomeLookupController::class, 'index'])
    ->middleware('throttle:60,1')
    ->name('welcome.lookups');
Route::get('/welcome-lookups/municipalities', [WelcomeLookupController::class, 'municipalities'])
    ->middleware('throttle:120,1')
    ->name('welcome.lookups.municipalities');

Route::post('event-registration', [EventRegistrationController::class, 'store'])
    ->middleware(['guest', 'throttle:10,1'])
    ->name('event-registration.store');

Route::middleware(['auth', 'active', 'verified'])->group(function () {
    Route::get('participant-profile', [ParticipantProfileController::class, 'edit'])
        ->name('participant-profile.edit');
    Route::patch('participant-profile', [ParticipantProfileController::class, 'update'])
        ->name('participant-profile.update');
});

Route::middleware(['auth', 'active', 'verified', 'admin'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::get('events-management', EventsManagementController::class)->name('events-management');
    Route::post('events-management', [EventsManagementController::class, 'store'])
        ->name('events-management.store');
    Route::patch('events-management/{event}', [EventsManagementController::class, 'update'])
        ->name('events-management.update');
    Route::patch('events-management/{event}/status', [EventsManagementController::class, 'toggleStatus'])
        ->name('events-management.status');
    Route::delete('events-management/{event}', [EventsManagementController::class, 'destroy'])
        ->name('events-management.destroy');
    Route::delete('events-management/materials/{material}', [EventsManagementController::class, 'destroyMaterial'])
        ->name('events-management.materials.destroy');
    Route::get('participants', ParticipantsController::class)->name('participants');
    Route::post('participants', [ParticipantsController::class, 'store'])
        ->name('participants.store');
    Route::get('page-settings', PageSettingsController::class)->name('page-settings');
    Route::post('page-settings/{table}', [PageSettingsController::class, 'store'])
        ->name('page-settings.store');
    Route::patch('page-settings/{table}/{id}', [PageSettingsController::class, 'update'])
        ->name('page-settings.update');
    Route::patch('page-settings/{table}/{id}/status', [PageSettingsController::class, 'toggleStatus'])
        ->name('page-settings.status');
    Route::delete('page-settings/{table}/{id}', [PageSettingsController::class, 'destroy'])
        ->name('page-settings.destroy');
    Route::patch('participants/{participant}', [ParticipantsController::class, 'update'])
        ->name('participants.update');
    Route::delete('participants/{participant}', [ParticipantsController::class, 'destroy'])
        ->name('participants.destroy');
    Route::patch('participants/{participant}/status', [ParticipantsController::class, 'toggleStatus'])
        ->name('participants.status');
    Route::post('participants/{participant}/password-reset', [ParticipantsController::class, 'resetPassword'])
        ->name('participants.password-reset');
    Route::patch('participants/{participant}/restore', [ParticipantsController::class, 'restore'])
        ->name('participants.restore');
});

require __DIR__.'/settings.php';
