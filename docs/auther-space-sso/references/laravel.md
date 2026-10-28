# Laravel (Socialite)

A complete, tested Socialite driver ships with this skill in `references/laravel/`. It was tested end to end against Laravel 13, Socialite 5.31 and firebase/php-jwt 7.2. It enforces PKCE (S256), state and nonce, verifies the ID token against JWKS, auto-provisions users on `sub`, and does RP-initiated logout.

## Install

```bash
composer require laravel/socialite firebase/php-jwt
```

Copy into the app (same paths as in `references/laravel/`):

```
app/Socialite/AutherSpaceProvider.php
app/Http/Controllers/Auth/AutherSpaceController.php
app/Providers/AutherSpaceServiceProvider.php
database/migrations/2026_10_21_000000_add_auther_sub_to_users_table.php
```

Register the provider in `bootstrap/providers.php` (Laravel 11+):

```php
return [
    App\Providers\AppServiceProvider::class,
    App\Providers\AutherSpaceServiceProvider::class,
];
```

Merge the `auther_space` entry from `references/laravel/config/services.auther_space.php` into `config/services.php`. Add the routes from `references/laravel/routes/auther-space.php` to `routes/web.php`.

```dotenv
AUTHER_SPACE_URL=https://systems.chedro12.com
AUTHER_SPACE_CLIENT_ID=<from the CHED XII admin>
AUTHER_SPACE_CLIENT_SECRET=<from the CHED XII admin>
AUTHER_SPACE_REDIRECT_URI=https://your-app.test/auth/callback
AUTHER_SPACE_POST_LOGOUT_REDIRECT_URI=https://your-app.test/
```

```bash
php artisan migrate
```

## Notes

- `Route::name('login')` points at `/auth/redirect`, so the `auth` middleware sends guests straight into SSO. Use `/auth/redirect` as the system's login initiation URL.
- The migration makes `users.password` nullable (SSO users have no local password) and adds a unique `auther_sub` column. On SQLite, `->change()` needs Laravel 11+.
- Sign-out form: `<form method="POST" action="{{ route('logout') }}">@csrf <button>Sign out</button></form>`.
- If the project already has users, keep the email-linking branch in `AutherSpaceController@callback`; it only links when `email_verified` is true and the user has no `auther_sub`.
