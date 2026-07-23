<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

test('an administrator can be created from the console', function () {
    $this->artisan('make:admin', [
        '--name' => 'CHED Administrator',
        '--email' => 'admin@example.com',
        '--password' => 'secure-password',
    ])->assertSuccessful();

    $admin = User::query()->where('email', 'admin@example.com')->firstOrFail();

    expect($admin->name)->toBe('CHED Administrator')
        ->and($admin->participant_id)->toMatch('/^CERS-[A-Z0-9]{4}-\d{4}$/')
        ->and($admin->participant_type)->toBe('admin')
        ->and($admin->organization)->toBe('Commission on Higher Education')
        ->and($admin->is_active)->toBeTrue()
        ->and($admin->email_verified_at)->not->toBeNull()
        ->and(Hash::check('secure-password', $admin->password))->toBeTrue()
        ->and($admin->isAdministrator())->toBeTrue()
        ->and($admin->isChedAdministrator())->toBeTrue();
});

test('the console command does not create an administrator with a duplicate email', function () {
    User::factory()->create(['email' => 'admin@example.com']);

    $this->artisan('make:admin', [
        '--name' => 'CHED Administrator',
        '--email' => 'admin@example.com',
        '--password' => 'secure-password',
    ])->assertFailed();

    expect(User::query()->where('email', 'admin@example.com')->count())->toBe(1);
});
