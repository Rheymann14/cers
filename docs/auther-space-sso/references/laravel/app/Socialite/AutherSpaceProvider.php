<?php

namespace App\Socialite;

use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Laravel\Socialite\Two\AbstractProvider;
use Laravel\Socialite\Two\InvalidStateException;
use Laravel\Socialite\Two\User;
use UnexpectedValueException;

/**
 * Socialite driver for Auther Space (OpenID Connect).
 *
 * - Authorization Code flow with PKCE (S256) — required by Auther Space.
 * - `state` and `nonce` are bound to the Laravel session.
 * - The ID token's RS256 signature is verified against the provider's JWKS,
 *   and iss / aud / exp / nonce are checked before the user is trusted.
 */
class AutherSpaceProvider extends AbstractProvider
{
    protected $scopes = ['openid', 'profile', 'email'];

    protected $scopeSeparator = ' ';

    protected $usesPKCE = true;

    /** Verified ID token claims from the last successful callback. */
    protected ?array $idTokenClaims = null;

    protected ?string $rawIdToken = null;

    protected function issuer(): string
    {
        return rtrim((string) config('services.auther_space.base_url'), '/');
    }

    public function redirect()
    {
        $nonce = Str::random(40);
        $this->request->session()->put('auther_space_nonce', $nonce);
        $this->with(['nonce' => $nonce]);

        return parent::redirect();
    }

    protected function getAuthUrl($state)
    {
        return $this->buildAuthUrlFromBase($this->issuer().'/oauth/authorize', $state);
    }

    protected function getTokenUrl()
    {
        return $this->issuer().'/oauth/token';
    }

    protected function getUserByToken($token)
    {
        $response = $this->getHttpClient()->get($this->issuer().'/oauth/userinfo', [
            'headers' => [
                'Accept' => 'application/json',
                'Authorization' => 'Bearer '.$token,
            ],
        ]);

        return json_decode((string) $response->getBody(), true);
    }

    public function user()
    {
        if ($this->user) {
            return $this->user;
        }

        if ($this->request->has('error')) {
            throw new InvalidStateException('Auther Space returned: '.$this->request->input('error'));
        }

        if ($this->hasInvalidState()) {
            throw new InvalidStateException;
        }

        $response = $this->getAccessTokenResponse($this->getCode());

        $this->rawIdToken = Arr::get($response, 'id_token');
        $this->idTokenClaims = $this->verifyIdToken((string) $this->rawIdToken);

        $user = $this->getUserByToken(Arr::get($response, 'access_token'));

        if (($user['sub'] ?? null) !== $this->idTokenClaims['sub']) {
            throw new InvalidStateException('userinfo subject does not match the ID token');
        }

        return $this->userInstance($response, $user);
    }

    protected function mapUserToObject(array $user)
    {
        return (new User)->setRaw(array_merge($user, [
            'id_token' => $this->rawIdToken,
            'id_token_claims' => $this->idTokenClaims,
        ]))->map([
            'id' => $user['sub'],
            'name' => $user['name'] ?? null,
            'nickname' => $user['preferred_username'] ?? null,
            'email' => $user['email'] ?? null,
            'avatar' => null,
        ]);
    }

    /**
     * Verify signature (JWKS), issuer, audience, expiry and nonce.
     *
     * @return array<string, mixed>
     */
    protected function verifyIdToken(string $jwt): array
    {
        if ($jwt === '') {
            throw new InvalidStateException('No ID token in the token response');
        }

        JWT::$leeway = 60;

        try {
            $claims = (array) JWT::decode($jwt, JWK::parseKeySet($this->jwks()));
        } catch (UnexpectedValueException $e) {
            // Unknown `kid` usually means the provider rotated keys: refresh once.
            $claims = (array) JWT::decode($jwt, JWK::parseKeySet($this->jwks(refresh: true)));
        }

        $expectedNonce = $this->request->session()->pull('auther_space_nonce');
        $audience = (array) ($claims['aud'] ?? []);

        if (($claims['iss'] ?? null) !== $this->issuer()) {
            throw new InvalidStateException('ID token issuer mismatch');
        }
        if (! in_array($this->clientId, $audience, true)) {
            throw new InvalidStateException('ID token audience mismatch');
        }
        if (! $expectedNonce || ! hash_equals($expectedNonce, (string) ($claims['nonce'] ?? ''))) {
            throw new InvalidStateException('ID token nonce mismatch');
        }

        return $claims;
    }

    /** @return array<string, mixed> */
    protected function jwks(bool $refresh = false): array
    {
        $key = 'auther_space.jwks.'.md5($this->issuer());
        if ($refresh) {
            Cache::forget($key);
        }

        return Cache::remember($key, now()->addHour(), function () {
            $response = $this->getHttpClient()->get($this->issuer().'/oauth/jwks', [
                'headers' => ['Accept' => 'application/json'],
            ]);

            return json_decode((string) $response->getBody(), true);
        });
    }

    /** RP-initiated logout URL (ends the Auther Space SSO session too). */
    public function logoutUrl(?string $idToken, ?string $postLogoutRedirectUri = null): string
    {
        $query = array_filter([
            'id_token_hint' => $idToken,
            'client_id' => $this->clientId,
            'post_logout_redirect_uri' => $postLogoutRedirectUri,
        ]);

        return $this->issuer().'/oauth/logout?'.http_build_query($query);
    }
}
