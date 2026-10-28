# Next.js (Auth.js / NextAuth v5)

Auther Space is a standard OIDC provider, so Auth.js needs no custom code.

```ts
// auth.ts
import NextAuth from "next-auth"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    {
      id: "auther-space",
      name: "CHED XII",
      type: "oidc",
      issuer: process.env.AUTHER_SPACE_URL, // https://systems.chedro12.com
      clientId: process.env.AUTHER_SPACE_CLIENT_ID,
      clientSecret: process.env.AUTHER_SPACE_CLIENT_SECRET,
      checks: ["pkce", "state", "nonce"],
      authorization: { params: { scope: "openid profile email" } },
    },
  ],
  callbacks: {
    // Keep the stable subject and the raw ID token (for logout).
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.sub = profile.sub ?? token.sub
        token.idToken = account.id_token
      }
      return token
    },
  },
})
```

```ts
// app/api/auth/[...nextauth]/route.ts
export { GET, POST } from "@/auth"
```

- **Redirect URI to register:** `https://<app>/api/auth/callback/auther-space`
- **Login initiation URL:** a route that calls `signIn("auther-space")` immediately, e.g. `app/login/route.ts` with a server action or `redirect` to `/api/auth/signin/auther-space`.
- Key your own database users on `token.sub`.
- **Logout:** call Auth.js `signOut()`, then redirect to `https://systems.chedro12.com/oauth/logout?id_token_hint=<idToken>&post_logout_redirect_uri=<registered URI>`.
