# Convex Auth setup (Phase 2)

Google sign-in via **Convex Auth** runs alongside Flask OAuth until Phase 5.

## 1. Convex environment variables

In the [Convex dashboard](https://dashboard.convex.dev) (or via CLI), set:

| Variable | Value |
|----------|--------|
| `AUTH_GOOGLE_ID` | Same Client ID as `GOOGLE_OAUTH_CLIENT_ID` |
| `AUTH_GOOGLE_SECRET` | Same secret as `GOOGLE_OAUTH_CLIENT_SECRET` |
| `SITE_URL` | `http://127.0.0.1:5000` (local Flask origin) |
| `JWT_PRIVATE_KEY` | From `node scripts/generate_auth_keys.mjs` |
| `JWKS` | From same script (second line) |

CLI examples:

```bash
npx convex env set AUTH_GOOGLE_ID "your-client-id.apps.googleusercontent.com"
npx convex env set AUTH_GOOGLE_SECRET "your-secret"
npx convex env set SITE_URL http://127.0.0.1:5000
```

Generate JWT keys (run once, paste both lines into Convex env):

```bash
node scripts/generate_auth_keys.mjs
```

Optional: sync Google vars from `.env`:

```bash
node scripts/sync_convex_auth_env.mjs
```

## 2. Google Cloud — add Convex redirect URI

In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth client → **Authorized redirect URIs**, add:

**Local Convex (from `.env.local` `CONVEX_SITE_URL`):**

```text
http://127.0.0.1:3211/api/auth/callback/google
```

**Cloud deployment:**

```text
https://YOUR-DEPLOYMENT.convex.site/api/auth/callback/google
```

Keep existing Flask URI:

```text
http://127.0.0.1:5000/auth/google/callback
https://YOUR-APP.onrender.com/auth/google/callback
```

## 3. Test sign-in

```bash
npm run convex:dev
python app.py
```

Open http://127.0.0.1:5000/convex-auth-test → **Sign in with Google (Convex)**.

After success, check Convex dashboard → **Data** → `users`, `authSessions`, `authAccounts`.

## 4. Verify Phase 2

```bash
npm run phase:gate -- 2
npx convex run authInfo:phase2Status
```
