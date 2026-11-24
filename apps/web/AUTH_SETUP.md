# Nexus authentication operations

Nexus exposes sign-in and password recovery only. It does not provide public account creation. Create or invite users through Supabase Auth administration; credentials remain owned by `auth.users`.

## Local environment

The Next.js project root is `apps/web`. Copy the root `.env.example` to `apps/web/.env.local`, set the Supabase project URL and publishable key, then restart `pnpm --filter web dev`. The workspace root `.env.local` is not loaded by this Next.js project. `.env.local` files are ignored by Git. In each deployed environment, set `NEXT_PUBLIC_SITE_URL` to that deployment's public HTTPS origin (for example `https://nexus.example.com`); leave it blank for local development to use the current browser origin.

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is preferred; `NEXT_PUBLIC_SUPABASE_ANON_KEY` remains supported for older projects. Both are public client keys protected by RLS. Never place a Supabase service-role key or Google OAuth client secret in Nexus or in any `NEXT_PUBLIC_` variable.

## Supabase Auth settings

1. In **Authentication → Settings → General**, turn off **Allow new users to sign up** so accounts are admin-provisioned. In **Authentication → Sign In / Providers**, enable Email and Google. Create/confirm the corresponding users in Supabase Auth before they use Nexus.
2. In **Authentication → URL Configuration**, set Site URL to the production app origin, never localhost. Add the callback URL for each environment to Redirect URLs: `http://localhost:3000/auth/callback`, `https://YOUR_PRODUCTION_DOMAIN/auth/callback`, and preview callback URLs only if used. The redirect passed to Supabase must match an allowed URL; otherwise Supabase can fall back to Site URL, which can send users to localhost. Nexus uses `NEXT_PUBLIC_SITE_URL` to choose the deployment origin for OAuth and recovery callbacks.
3. For production email delivery, configure a custom SMTP provider using a verified sending domain. Keep auth emails transactional and configure SPF/DKIM with the mail provider.
4. In **Authentication → Sign In / Providers → Auth settings**, set the minimum password length to 12 or more. Enable leaked-password protection where available. The UI meter is a guide; Supabase Auth enforces the server-side password policy.
5. Keep rate limits enabled and set recovery-link expiry to one hour or less.

### Password recovery links

The login page sends a Supabase recovery link. It returns through `/auth/callback` and opens `/reset-password`; the user chooses a new password there. In **Authentication → Email Templates → Reset Password**, keep the project’s secure confirmation link (`{{ .ConfirmationURL }}`) in the message, for example:

```html
<h2>Reset your Nexus password</h2>
<p>
  Use the secure link below to choose a new password. This link expires soon and
  can only be used once.
</p>
<p><a href="{{ .ConfirmationURL }}">Reset your Nexus password</a></p>
<p>If you did not request a reset, you can ignore this email.</p>
```

Set the project's recovery-link expiry and Site URL in Supabase Auth. Allow the local and production `/auth/callback` URLs under **Authentication → URL Configuration**. SMTP, email template, redirect allowlist, and Confirm Email settings are project-side requirements.

## Fix Google: `Unsupported provider: missing OAuth secret`

This response means the Supabase project addressed by `NEXT_PUBLIC_SUPABASE_URL` has no usable Google client secret saved for the enabled provider. Adding only the client ID is not enough. If you already saved a secret, first confirm that the project reference in the app URL is the same project whose Auth settings you edited.

1. In Google Cloud Console, create an OAuth 2.0 **Web application** client. Add `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback` as an authorized redirect URI.
2. Copy both the Google **Client ID** and **Client secret** into Supabase **Authentication → Sign In / Providers → Google**, enable the provider, and save.
3. In Supabase **Authentication → URL Configuration**, allow the Nexus `/auth/callback` URL.
4. Restart the Nexus dev server and try Google sign-in again.

The Google secret belongs only in Supabase's provider settings. Nexus maps this Supabase response to a setup message and never sends or stores the secret. If public sign-ups are disabled, provision the user in Supabase Auth before the first Google login.

## CAPTCHA and abuse protection

Nexus supports Cloudflare Turnstile on sign-in and reset-link requests. Create a Turnstile widget for the app's domains, add its **site key** as `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in `apps/web/.env.local`, and configure the matching **secret key** in Supabase **Project Settings → Authentication → Bot and Abuse Protection → CAPTCHA**. Enable CAPTCHA and select Cloudflare Turnstile there. Allow `localhost` for development. The site key is public; the secret stays in Supabase. When CAPTCHA is enabled in Supabase, configure the site key in Nexus too so requests can include challenge tokens.

Supabase rate limits remain necessary even with CAPTCHA enabled. Do not expose public admin or service-role APIs to the browser.

## Protected pages and user data

The dashboard and its nested application pages require a verified Supabase user on the server. `proxy.ts` refreshes cookie sessions; the dashboard layout verifies the user again before rendering. The app returns `noindex` metadata, an `X-Robots-Tag`, and a robots policy that disallows crawling. Robots directives reduce indexing; the server-side auth check is the actual access control.

Apply `supabase/migrations/202611230001_profiles.sql` once to each Supabase project (through the Supabase SQL Editor or `supabase db push`) before relying on profile data. It creates `public.profiles`, backfills existing identities, adds a profile trigger, and applies owner-only RLS. Next.js does not run this migration automatically. If it has already been applied, do not run the SQL file again manually. Any future private table needs its own RLS policies tied to `auth.uid()`.
