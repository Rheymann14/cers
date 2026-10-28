<?php

use App\Models\User;
use Firebase\JWT\JWT;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

uses(RefreshDatabase::class);

const ISSUER = 'https://systems.chedro12.com';
const CLIENT_ID = 'as_test_client';

beforeEach(function () {
    config([
        'services.auther_space.base_url' => ISSUER,
        'services.auther_space.client_id' => CLIENT_ID,
        'services.auther_space.client_secret' => 'test-secret',
        'services.auther_space.redirect' => 'http://localhost/auth/callback',
        'services.auther_space.post_logout_redirect' => 'http://localhost/',
    ]);

    [$this->privateKey, $rsa] = signingKey();
    $this->jwks = ['keys' => [[
        'kty' => 'RSA',
        'use' => 'sig',
        'alg' => 'RS256',
        'kid' => 'test-key',
        'n' => rtrim(strtr(base64_encode($rsa['n']), '+/', '-_'), '='),
        'e' => rtrim(strtr(base64_encode($rsa['e']), '+/', '-_'), '='),
    ]]];
});

/**
 * A throwaway RSA key standing in for the provider's signing key.
 *
 * @return array{0: string, 1: array<string, string>} PEM private key and RSA details
 */
function signingKey(): array
{
    static $key;

    if (! $key) {
        // A minimal config, since PHP on Windows often ships without openssl.cnf.
        $config = tempnam(sys_get_temp_dir(), 'openssl');
        file_put_contents($config, "[req]\ndistinguished_name = dn\n[dn]\n");
        $options = ['config' => $config, 'private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA];

        $resource = openssl_pkey_new($options);
        openssl_pkey_export($resource, $pem, null, $options);
        unlink($config);

        $key = [$pem, openssl_pkey_get_details($resource)['rsa']];
    }

    return $key;
}

/**
 * Start sign-in, then complete the callback with the given CHED XII user.
 * `$overrides` changes ID token claims; `$query` changes callback parameters.
 */
function signInWithChedXii(array $userinfo, array $overrides = [], array $query = [])
{
    $test = test();
    Socialite::forgetDrivers();

    $location = $test->get(route('auther-space.redirect'))->headers->get('Location');
    parse_str(parse_url($location, PHP_URL_QUERY), $params);

    $claims = array_merge([
        'iss' => ISSUER,
        'aud' => CLIENT_ID,
        'sub' => $userinfo['sub'],
        'exp' => time() + 300,
        'iat' => time(),
        'nonce' => $params['nonce'],
        'account_type' => $userinfo['account_type'] ?? 'region',
    ], $overrides);

    $responses = new MockHandler([
        new Response(200, [], json_encode([
            'access_token' => 'access-token',
            'token_type' => 'Bearer',
            'expires_in' => 3600,
            'id_token' => JWT::encode($claims, $test->privateKey, 'RS256', 'test-key'),
        ])),
        new Response(200, [], json_encode($test->jwks)),
        new Response(200, [], json_encode($userinfo)),
    ]);
    config(['services.auther_space.guzzle' => ['handler' => HandlerStack::create($responses)]]);
    Socialite::forgetDrivers();

    return $test->get(route('auther-space.callback', array_merge([
        'code' => 'auth-code',
        'state' => $params['state'],
        'iss' => ISSUER,
    ], $query)));
}

function chedXiiUser(array $overrides = []): array
{
    return array_merge([
        'sub' => (string) Str::uuid(),
        'name' => 'Maria Clara Santos',
        'email' => 'maria.santos@ched.gov.ph',
        'email_verified' => true,
        'account_type' => 'region',
    ], $overrides);
}

/** A CERS administrator, as created by `make:admin`, not yet linked to CHED XII. */
function cersAdmin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'participant_type' => 'admin',
        'organization' => 'Commission on Higher Education',
        'email' => 'maria.santos@ched.gov.ph',
    ], $attributes));
}

test('sign-in starts the authorization code flow with PKCE, state and nonce', function () {
    $location = $this->get(route('auther-space.redirect'))->assertRedirect()->headers->get('Location');
    parse_str(parse_url($location, PHP_URL_QUERY), $params);

    expect($location)->toStartWith(ISSUER.'/oauth/authorize?')
        ->and($params)->toMatchArray([
            'client_id' => CLIENT_ID,
            'redirect_uri' => 'http://localhost/auth/callback',
            'response_type' => 'code',
            'scope' => 'openid profile email',
            'code_challenge_method' => 'S256',
        ])
        ->and($params)->toHaveKeys(['state', 'nonce', 'code_challenge']);
});

test('a CERS administrator is linked by verified email on first sign-in', function () {
    $admin = cersAdmin();
    $remote = chedXiiUser();

    signInWithChedXii($remote)->assertRedirect(route('dashboard', absolute: false));

    $this->assertAuthenticatedAs($admin);
    expect($admin->fresh()->auther_sub)->toBe($remote['sub'])
        ->and($admin->fresh()->isChedAdministrator())->toBeTrue();
});

test('linking keeps the role CERS gave the administrator', function () {
    $admin = cersAdmin(['organization' => 'Notre Dame University', 'email' => 'admin@ndu.edu.ph']);

    signInWithChedXii(chedXiiUser(['email' => 'admin@ndu.edu.ph', 'account_type' => 'hei']))
        ->assertRedirect(route('dashboard', absolute: false));

    $this->assertAuthenticatedAs($admin);
    expect($admin->fresh()->organization)->toBe('Notre Dame University')
        ->and($admin->fresh()->isChedAdministrator())->toBeFalse();
});

test('returning users are matched on sub, not email', function () {
    $admin = cersAdmin(['email' => 'old.address@ched.gov.ph']);
    $remote = chedXiiUser(['email' => 'new.address@ched.gov.ph']);
    $admin->forceFill(['auther_sub' => $remote['sub']])->save();

    signInWithChedXii($remote)->assertRedirect(route('dashboard', absolute: false));

    $this->assertAuthenticatedAs($admin);
    expect($admin->fresh()->email)->toBe('old.address@ched.gov.ph');
});

test('CHED XII users without a CERS administrator account are refused', function (string $accountType) {
    signInWithChedXii(chedXiiUser(['account_type' => $accountType]))
        ->assertRedirect(route('login'))
        ->assertSessionHasErrors(['sso' => 'You do not have access to CERS.']);

    $this->assertGuest();
    expect(User::query()->count())->toBe(0);
})->with(['region', 'hei']);

test('a participant account with the same email is refused and left untouched', function () {
    $participant = cersAdmin(['participant_type' => 'participant', 'organization' => 'Notre Dame University']);

    signInWithChedXii(chedXiiUser())->assertSessionHasErrors(['sso' => 'You do not have access to CERS.']);

    $this->assertGuest();
    $participant->refresh();
    expect($participant->auther_sub)->toBeNull()
        ->and($participant->participant_type)->toBe('participant')
        ->and($participant->organization)->toBe('Notre Dame University');
});

test('users whose admin role was removed in CERS are refused', function () {
    $user = cersAdmin(['participant_type' => 'participant']);
    $remote = chedXiiUser();
    $user->forceFill(['auther_sub' => $remote['sub']])->save();

    signInWithChedXii($remote)->assertSessionHasErrors(['sso' => 'You do not have access to CERS.']);

    $this->assertGuest();
    expect($user->fresh()->participant_type)->toBe('participant');
});

test('an unverified email is never used to link an account', function () {
    $admin = cersAdmin();

    signInWithChedXii(chedXiiUser(['email_verified' => false]))
        ->assertRedirect(route('login'))
        ->assertSessionHasErrors('sso');

    $this->assertGuest();
    expect($admin->fresh()->auther_sub)->toBeNull();
});

test('deactivated accounts are refused', function () {
    $admin = cersAdmin(['is_active' => false]);

    signInWithChedXii(chedXiiUser())->assertSessionHasErrors('sso');

    $this->assertGuest();
    expect($admin->fresh()->auther_sub)->toBeNull();
});

test('ID tokens that fail verification are rejected', function (array $overrides) {
    $admin = cersAdmin();

    signInWithChedXii(chedXiiUser(), $overrides)
        ->assertRedirect(route('login'))
        ->assertSessionHasErrors(['sso' => 'CHED XII sign-in could not be verified. Please try again.']);

    $this->assertGuest();
    expect($admin->fresh()->auther_sub)->toBeNull();
})->with([
    'wrong audience' => [['aud' => 'another-client']],
    'wrong issuer' => [['iss' => 'https://evil.example']],
    'wrong nonce' => [['nonce' => 'replayed-nonce']],
    'expired' => [['exp' => time() - 3600]],
]);

test('a callback from another issuer is rejected', function () {
    cersAdmin();

    signInWithChedXii(chedXiiUser(), query: ['iss' => 'https://evil.example'])
        ->assertSessionHasErrors(['sso' => 'CHED XII sign-in could not be verified. Please try again.']);

    $this->assertGuest();
});

test('a callback with a forged state is rejected', function () {
    cersAdmin();

    signInWithChedXii(chedXiiUser(), query: ['state' => 'forged'])
        ->assertSessionHasErrors(['sso' => 'CHED XII sign-in could not be verified. Please try again.']);

    $this->assertGuest();
});

test('an access_denied callback shows a message', function () {
    $this->get(route('auther-space.callback', ['error' => 'access_denied']))
        ->assertRedirect(route('login'))
        ->assertSessionHasErrors(['sso' => 'You do not have access to CERS.']);
});

test('logging out also ends the CHED XII session', function () {
    cersAdmin();
    signInWithChedXii(chedXiiUser());
    $this->assertAuthenticated();

    $response = $this->post(route('logout'));

    $this->assertGuest();
    $location = $response->assertRedirect()->headers->get('Location');
    parse_str(parse_url($location, PHP_URL_QUERY), $params);
    expect($location)->toStartWith(ISSUER.'/oauth/logout?')
        ->and($params)->toHaveKeys(['id_token_hint'])
        ->and($params['post_logout_redirect_uri'])->toBe('http://localhost/');
});

test('logging out from an Inertia request leaves the app for the CHED XII logout page', function () {
    cersAdmin();
    signInWithChedXii(chedXiiUser());

    $this->post(route('logout'), [], ['X-Inertia' => 'true'])
        ->assertStatus(409)
        ->assertHeader('X-Inertia-Location');
});

test('password users log out locally only', function () {
    $this->actingAs(User::factory()->create(['participant_type' => 'admin']));

    $this->post(route('logout'))->assertRedirect('/');

    $this->assertGuest();
});
