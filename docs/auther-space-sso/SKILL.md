---
name: auther-space-sso
description: Integrate an application with CHED Region XII single sign-on (Auther Space, an OpenID Connect provider at https://systems.chedro12.com). Use when adding "Sign in with CHED XII", SSO, OIDC or OAuth login, account linking, logout, or the systems directory API to a Laravel, Next.js, Rust or other web app for the Commission on Higher Education Region XII.
---

# CHED XII single sign-on (Auther Space)

Auther Space is the self-hosted OpenID Connect provider behind **Commission on Higher Education Region XII Systems**. Every CHED XII system signs users in through it, so one CHED XII account opens every system the user has access to.

- **Issuer:** `https://systems.chedro12.com`
- **Discovery:** `https://systems.chedro12.com/.well-known/openid-configuration` (configure libraries from this; don't hard-code endpoints when the library supports discovery)

| Endpoint | URL |
|---|---|
| Authorize | `https://systems.chedro12.com/oauth/authorize` |
| Token | `https://systems.chedro12.com/oauth/token` |
| UserInfo | `https://systems.chedro12.com/oauth/userinfo` |
| JWKS | `https://systems.chedro12.com/oauth/jwks` |
| Revoke | `https://systems.chedro12.com/oauth/revoke` |
| End session | `https://systems.chedro12.com/oauth/logout` |

## Before writing code

1. Ask the user for the app's **client ID** and **client secret**. They come from *Admin → Systems → Register system* (superadmins and developers can register systems); developers assigned to an existing system find them under its **Credentials** tab. Never invent them or commit them; put them in the app's `.env` / secret store.
2. Confirm the **redirect URI** registered for the app (e.g. `https://app.chedro12.com/auth/callback`). It must match **exactly**, character for character. HTTPS is required except for `localhost` and `*.test` hosts.
3. Ask for the app's **login initiation URL** (e.g. `/auth/redirect`). The CHED XII directory's "Launch" button opens it, so it must immediately start the SSO redirect without showing a local login form.

## Hard requirements (the provider enforces these)

- **Authorization Code flow only.** `response_type=code`. No implicit or hybrid flow.
- **PKCE with S256 is mandatory for every client**, confidential ones included. Send `code_challenge` + `code_challenge_method=S256`, then `code_verifier` at the token endpoint.
- Scopes must include `openid`. Available: `openid profile email offline_access` (`offline_access` gives a rotating refresh token, if the admin enabled it for the client).
- Client authentication: `client_secret_basic` or `client_secret_post` for confidential clients; `none` (PKCE only) for public clients (SPAs, mobile).
- Authorization codes are single-use and expire after 60 seconds. Exchange them immediately on the callback.
- Send and check `state` (CSRF) and `nonce` (replay). The callback also includes `iss`; it must equal the issuer.

## Verify the ID token

ID tokens are **RS256** JWTs signed with keys published at the JWKS endpoint (keys rotate; refetch JWKS when you see an unknown `kid`). Check:

- signature against JWKS, `alg` = RS256
- `iss` = `https://systems.chedro12.com`
- `aud` contains your client ID
- `exp` not passed (allow ~60s clock skew)
- `nonce` equals the one you stored for this login

Claims: `sub`, `iss`, `aud`, `exp`, `iat`, `auth_time`, `nonce`, `at_hash`, `sid`, `azp`; with `profile`: `name`, `preferred_username`, `updated_at`, plus `hei_uii` and `hei_name` for assigned HEI accounts; with `email`: `email`, `email_verified`. Always: `account_type` (`region` for Regional Office staff, `hei` for HEI users); `system_attributes` (object of the system's access-field values, e.g. `{"date_started": "2024-01-15"}`) when the system defines access fields.

## Link and provision local accounts

`sub` is a stable UUID and **the only identifier to key local accounts on**. On callback:

1. Find the local user by `sub` (store it in a dedicated unique column, e.g. `auther_sub`).
2. If none and `email_verified` is true, link an existing local user with the same email **that has no `sub` yet** (one-time migration of pre-SSO accounts).
3. Otherwise create the user automatically (no local password).

Never match on email alone after the first sign-in. People change emails; `sub` never changes.

## Access control

Admins grant access per system. If a user has no access, Auther Space shows its own "access denied" page and **never calls your callback**, so the app doesn't need to re-check CHED XII access. It still owns its *own* roles and permissions after sign-in.

`prompt=none` returns `error=login_required` or `error=access_denied` to the callback instead of showing UI. Handle `error` on the callback in general.

HEI accounts represent one institution. Use the exact `hei_uii` string to authorize institution records, including any campus suffix. Missing affiliation claims mean unassigned, not permission to choose a UII. Trusted inviters can fill missing affiliations; superadmins correct assigned ones. Fetch institution choices from public `GET https://systems.chedro12.com/api/heis`.

## Logout

Sign out locally first, then redirect to the end-session endpoint to end the CHED XII SSO session as well:

```
https://systems.chedro12.com/oauth/logout?id_token_hint=<id token>&post_logout_redirect_uri=<registered URI>&state=<optional>
```

`post_logout_redirect_uri` must be registered for the client (Admin → Systems → Settings), or the user lands on the CHED XII sign-in page.

## Framework guides

Read the one that matches the project:

- Laravel (Socialite), complete tested files: `references/laravel.md` and `references/laravel/`
- Next.js (Auth.js): `references/nextjs.md`
- Rust (`openidconnect` crate): `references/rust.md`
- Anything else (generic OIDC, raw HTTP): `references/generic-oidc.md`
- Listing CHED XII systems in another app: `references/directory-api.md`
- Importing a system's existing users (invitations): `references/user-import.md`
- Inviting users from the system's own screens (invite, status, resend): the separate `auther-space-members` skill (Admin → Members API)

## Checklist before finishing

- [ ] Client ID/secret read from environment, not hard-coded or committed
- [ ] Redirect URI in config matches the registered one exactly
- [ ] PKCE S256, `state` and `nonce` all sent and verified
- [ ] ID token signature + `iss` + `aud` + `exp` + `nonce` verified
- [ ] Local users keyed on `sub`; email linking only when `email_verified`
- [ ] Callback handles `error` (e.g. `access_denied`)
- [ ] Logout ends the local session, then calls the end-session endpoint
- [ ] Login initiation route starts SSO directly (used by the directory's Launch button)
