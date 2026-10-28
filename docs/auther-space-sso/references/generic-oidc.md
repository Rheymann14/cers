# Generic OIDC (any language)

Prefer a certified OIDC client library for your stack and point it at the issuer `https://systems.chedro12.com`. If you must do it by hand:

## 1. Redirect to authorize

```
GET https://systems.chedro12.com/oauth/authorize
  ?response_type=code
  &client_id=<client id>
  &redirect_uri=<registered redirect URI, URL-encoded>
  &scope=openid%20profile%20email
  &state=<random, stored in session>
  &nonce=<random, stored in session>
  &code_challenge=<BASE64URL(SHA256(code_verifier))>
  &code_challenge_method=S256
```

`code_verifier` is 43 to 128 characters from `[A-Za-z0-9-._~]`; store it in the session.

## 2. Callback

`GET <redirect_uri>?code=...&state=...&iss=https://systems.chedro12.com` or `?error=access_denied&state=...`. Check `state`, then exchange immediately (codes live 60s):

```
POST https://systems.chedro12.com/oauth/token
Authorization: Basic base64(urlencode(client_id) + ":" + urlencode(client_secret))
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=...&redirect_uri=...&code_verifier=...
```

Response: `access_token`, `token_type=Bearer`, `expires_in`, `id_token`, `scope` (+ `refresh_token` with `offline_access`).

## 3. Verify the ID token, then read the profile

Verify RS256 against `https://systems.chedro12.com/oauth/jwks` (match `kid`), plus `iss`, `aud`, `exp` and `nonce`. Optionally call `GET https://systems.chedro12.com/oauth/userinfo` with `Authorization: Bearer <access_token>`; its `sub` must equal the ID token's.

## 4. Refresh (optional)

`POST https://systems.chedro12.com/oauth/token` with `grant_type=refresh_token&refresh_token=...`. Refresh tokens rotate: always store the new one.

## 5. Logout

`https://systems.chedro12.com/oauth/logout?id_token_hint=<id token>&post_logout_redirect_uri=<registered>&state=<optional>`
