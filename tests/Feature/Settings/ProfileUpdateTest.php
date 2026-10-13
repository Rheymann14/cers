<?php

use App\Models\User;
use Illuminate\Support\Facades\Storage;

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('profile.edit'));

    $response->assertOk();
});

test('profile information can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $user->refresh();

    expect($user->name)->toBe('Test User');
    expect($user->email)->toBe('test@example.com');
    expect($user->email_verified_at)->toBeNull();
});

test('email verification status is unchanged when the email address is unchanged', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => $user->email,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->email_verified_at)->not->toBeNull();
});

test('profile image can be updated', function () {
    Storage::fake();

    $user = User::factory()->create();
    $avatar = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => $user->email,
            'avatar' => $avatar,
            'remove_avatar' => false,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $user->refresh();

    $path = $user->getRawOriginal('avatar');

    expect($path)->toStartWith('profile-photos/');
    expect($user->avatar)->toBe(route('media.show', $path));
    Storage::disk()->assertExists($path);

    $this->get($user->avatar)->assertOk();
});

test('profile image can be removed', function () {
    Storage::fake();
    Storage::disk()->put('profile-photos/avatar.jpg', 'avatar');

    $user = User::factory()->create([
        'avatar' => '/storage/profile-photos/avatar.jpg',
    ]);

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => $user->email,
            'avatar' => null,
            'remove_avatar' => true,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->avatar)->toBeNull();
    Storage::disk()->assertMissing('profile-photos/avatar.jpg');
});

test('media route only serves files from upload directories', function () {
    Storage::fake();
    Storage::disk()->put('profile-photos/avatar.jpg', 'avatar');
    Storage::disk()->put('secret.txt', 'secret');

    $this->get('/media/profile-photos/avatar.jpg')->assertOk();
    $this->get('/media/profile-photos/missing.jpg')->assertNotFound();
    $this->get('/media/secret.txt')->assertNotFound();
    $this->get('/media/profile-photos/../secret.txt')->assertNotFound();
});

test('user can delete their account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->delete(route('profile.destroy'), [
            'password' => 'password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('home'));

    $this->assertGuest();
    expect($user->fresh())->toBeNull();
});

test('correct password must be provided to delete account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('profile.edit'))
        ->delete(route('profile.destroy'), [
            'password' => 'wrong-password',
        ]);

    $response
        ->assertSessionHasErrors('password')
        ->assertRedirect(route('profile.edit'));

    expect($user->fresh())->not->toBeNull();
});
