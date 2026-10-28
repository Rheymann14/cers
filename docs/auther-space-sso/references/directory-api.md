# CHED XII systems directory API

The CHED XII directory (`https://systems.chedro12.com/`) lists every system. Other apps can read it as JSON.

```bash
# Public systems (no auth)
curl https://systems.chedro12.com/api/v1/portal/systems

# Systems for a signed-in user (their OIDC access token), with has_access flags
curl -H "Authorization: Bearer <access_token>" https://systems.chedro12.com/api/v1/me/systems
```

Each system: `id`, `slug`, `name`, `description`, `category`, `audiences` (`region` / `hei`), `status` (`live` / `beta` / `maintenance`), `is_featured`, `homepage_url`, `logo_url`, `thumbnail_url` (the first screenshot, or null), `launch_url`, `access_policy`, `sso_enabled`, `has_access`.

`sso_enabled: false` marks a showcase system: listed in the directory but not yet connected to single sign-on. Its `launch_url` is its homepage, and `has_access` doesn't apply (there is nothing to sign in to yet), so don't render it as locked.

- `launch_url` is the system's login initiation URL; opening it starts that app's SSO.
- Each system's public page is `https://systems.chedro12.com/systems/<slug>`.
- Hidden and signed-in-only systems never appear in the public list.
