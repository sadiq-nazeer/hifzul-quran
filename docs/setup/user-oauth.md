# User OAuth setup guide

This guide walks you through setting **QF_OAUTH_REDIRECT_URI**, **QF_OAUTH_COOKIE_SECRET**, and registering your callback URL with Quran Foundation so sign-in and User APIs work.

Reference: [Using OAuth 2.0 to Access Quran.Foundation APIs](https://api-docs.quran.foundation/docs/tutorials/oidc/getting-started-with-oauth2).

---

## 1. Set environment variables

In your project root, copy `.env.example` to `.env.local` (if you haven’t already), then add or edit these lines.

### QF_OAUTH_REDIRECT_URI

This must be the **exact** URL where users land after signing in at Quran Foundation. For this app it’s the callback route:

- **Local development:**  
  `QF_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/callback`
- **Production:**  
  Use your real origin. You can use either path:
  - `QF_OAUTH_REDIRECT_URI=https://your-domain.com/api/auth/callback` (default), or
  - `QF_OAUTH_REDIRECT_URI=https://your-domain.com/oauth/callback` (rewritten internally to the same handler; register this URL with the provider if you use it).

Rules from the docs:

- Must match **exactly** (scheme, host, path, trailing slash if you use one).
- No extra query params in this value; the provider will append `?code=...&state=...`.

### QF_OAUTH_COOKIE_SECRET

A secret used to sign and encrypt OAuth cookies (pending auth state and session). Generate a random value and **do not commit it** (keep it only in `.env.local`).

**Option A – OpenSSL (recommended):**

```bash
openssl rand -hex 32
```

Copy the output (e.g. `a1b2c3d4e5f6...`) and set:

```env
QF_OAUTH_COOKIE_SECRET=a1b2c3d4e5f6...
```

**Option B – Node (one-off):**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use the printed string as `QF_OAUTH_COOKIE_SECRET`.

**Option C – PowerShell (Windows):**

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]]).Replace('+','-').Replace('/','_').Replace('=','')
```

You can use that value, or generate a 64-char hex string another way and use that.

---

## 2. Register the callback URL with Quran Foundation

Quran Foundation requires your redirect URI to be **registered** for your client. If it isn’t, you’ll get `redirect_uri_mismatch` when users return from sign-in.

### If you don’t have API access yet

1. Go to **[Request API Access](https://api-docs.quran.foundation/request-access)**.
2. Fill in **App Name** and **Email Address** (required).
3. In **Optional: OAuth2 & user data**, set **Redirect URI** to your callback URL:
   - Local: `http://localhost:3000/api/auth/callback`
   - Production: `https://your-domain.com/api/auth/callback`
4. Submit the form. After approval you’ll receive **client_id** (and optionally **client_secret**). Use the same redirect URI in `QF_OAUTH_REDIRECT_URI` as you put in the form.

### If you already have API access

If you already have a client but didn’t add a redirect URI (or need to add another one):

- The public docs don’t show a self-service “add redirect URI” page. You typically need to:
  - **Add the redirect URI when you first request access** (see above), or  
  - **Ask Quran Foundation** (e.g. via the contact or process they gave you when you got access) to add `http://localhost:3000/api/auth/callback` (and your production URL when you have it) to your app’s allowed redirect URIs.

Once your callback URL is registered, it must **exactly** match `QF_OAUTH_REDIRECT_URI` in `.env.local` (same scheme, host, path, no trailing slash unless the registered URI has one).

---

## 3. Optional: QF_ENV

- `QF_ENV=prelive` (default) – Pre-production auth and APIs.
- `QF_ENV=production` – Production auth and APIs.

Use the same environment as the one in which your client and redirect URI are configured. Don’t mix: e.g. a prelive redirect URI won’t work with production tokens.

---

## 4. Quick checklist

| Step | What to do |
|------|------------|
| 1 | Add `QF_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/callback` to `.env.local`. |
| 2 | Generate a secret and set `QF_OAUTH_COOKIE_SECRET=...` in `.env.local`. |
| 3 | Register `http://localhost:3000/api/auth/callback` (and production URL when ready) in the [Request Access](https://api-docs.quran.foundation/request-access) form or with Quran Foundation support. |
| 4 | Ensure `QF_CLIENT_ID` (and `QF_CLIENT_SECRET` if you use it) are set and match the environment you use. |
| 5 | Run `npm run dev`, open `/`, click **Sign in**, and complete the flow to confirm the callback works. |

---

## 5. Troubleshooting

| Issue | What to check |
|-------|----------------|
| `redirect_uri_mismatch` | Registered redirect URI and `QF_OAUTH_REDIRECT_URI` must match exactly (including `http` vs `https`, port, path). |
| “Missing QF_OAUTH_COOKIE_SECRET” | Set `QF_OAUTH_COOKIE_SECRET` in `.env.local` and restart the dev server. |
| “Missing QF_OAUTH_REDIRECT_URI” | Set `QF_OAUTH_REDIRECT_URI` in `.env.local` and restart the dev server. |
| Invalid grant / 401 after callback | Don’t reuse the same authorization code; use prelive vs production consistently; check system time (clock skew). |

For more on errors and security, see the [OAuth2 doc – Important Considerations & Troubleshooting](https://api-docs.quran.foundation/docs/tutorials/oidc/getting-started-with-oauth2#important-considerations).
