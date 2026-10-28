# Rust (`openidconnect` crate)

```toml
openidconnect = "4"
```

```rust
use openidconnect::{core::*, *};

let http = reqwest::ClientBuilder::new()
    .redirect(reqwest::redirect::Policy::none()) // required for SSRF safety
    .build()?;
let provider = CoreProviderMetadata::discover_async(
    IssuerUrl::new("https://systems.chedro12.com".into())?, &http).await?;
let client = CoreClient::from_provider_metadata(
        provider,
        ClientId::new(std::env::var("AUTHER_SPACE_CLIENT_ID")?),
        Some(ClientSecret::new(std::env::var("AUTHER_SPACE_CLIENT_SECRET")?)),
    )
    .set_redirect_uri(RedirectUrl::new(std::env::var("AUTHER_SPACE_REDIRECT_URI")?)?);

// 1. Redirect: store csrf, nonce and pkce_verifier in the user's session.
let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();
let (auth_url, csrf, nonce) = client
    .authorize_url(CoreAuthenticationFlow::AuthorizationCode, CsrfToken::new_random, Nonce::new_random)
    .add_scope(Scope::new("profile".into()))
    .add_scope(Scope::new("email".into()))
    .set_pkce_challenge(pkce_challenge)
    .url();

// 2. Callback: check `state` == csrf, then exchange the code.
let tokens = client
    .exchange_code(AuthorizationCode::new(code))?
    .set_pkce_verifier(pkce_verifier)
    .request_async(&http)
    .await?;
let id_token = tokens.id_token().ok_or("no id_token")?;
let claims = id_token.claims(&client.id_token_verifier(), &nonce)?; // verifies sig, iss, aud, exp, nonce
let sub = claims.subject().as_str(); // key local users on this
```

Logout: clear the local session, then redirect to `https://systems.chedro12.com/oauth/logout?id_token_hint=<id token>&post_logout_redirect_uri=<registered URI>`.
