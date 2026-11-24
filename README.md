# Nexus

Nexus is a private workspace application built as a pnpm monorepo. It uses Next.js App Router, React, Supabase Auth, and a shared shadcn-based UI package. Public account registration is intentionally disabled; workspace access is provisioned by an administrator.

## Requirements

- Node.js 20.9 or newer
- pnpm 11.25.0 (the version declared in the root `package.json`)
- A Supabase project for authentication and profile data

## Get started

Run these commands from the repository root:

```sh
pnpm install
cp .env.example apps/web/.env.local
pnpm --filter web dev
```

On Windows PowerShell, use `Copy-Item .env.example apps/web/.env.local` for the copy step. Create the local file only if it does not already exist, then add your project values and restart the dev server. The Next.js app reads its environment from `apps/web/.env.local`, not a root `.env.local`.

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable                               | Required       | Purpose                                                 |
| -------------------------------------- | -------------- | ------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Yes            | Supabase project URL                                    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes, preferred | Supabase publishable client key                         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | Alternative    | Legacy anon key for older Supabase projects             |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`       | No             | Cloudflare Turnstile site key for auth abuse protection |

Use either the publishable key or the legacy anon key. These are public client keys and must be protected with RLS. Never put a Supabase service-role key or Google OAuth client secret in frontend code or a `NEXT_PUBLIC_` variable.

## Authentication setup

Nexus supports email/password sign-in and Google sign-in. Password recovery is available from the login screen and uses a Supabase email link; users choose a new password after returning to Nexus. There is no public signup page or OTP-entry reset flow.

1. In Supabase Auth settings, disable **Allow new users to sign up** and provision authorized users through Supabase Auth.
2. Configure the Supabase Site URL and add the local and deployed callback URLs to the Auth redirect allowlist:
   - `http://localhost:3000/auth/callback`
   - `https://YOUR_DOMAIN/auth/callback`
3. In **Authentication → Email Templates → Reset Password**, include the secure `{{ .ConfirmationURL }}` link. Configure SMTP for reliable production delivery and set a suitable recovery-link expiry.
4. To enable Google sign-in, create a Google OAuth Web application. Set `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback` as its authorized redirect URI, then save the Google Client ID and Client Secret in the Google provider settings in Supabase. Keep the secret in Supabase only.
5. If enabling CAPTCHA in Supabase Auth, configure Cloudflare Turnstile there and set the matching public site key in `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.

See [apps/web/AUTH_SETUP.md](apps/web/AUTH_SETUP.md) for detailed provider, email, CAPTCHA, redirect, and security configuration.

### Profile table and RLS migration

Apply [`supabase/migrations/202611230001_profiles.sql`](supabase/migrations/202611230001_profiles.sql) once to each Supabase project. It creates `public.profiles`, associates rows with `auth.users.id`, backfills existing users, creates a profile for new Auth users, and applies owner-only RLS policies. Apply the SQL through the Supabase SQL Editor, or initialize/configure the Supabase CLI, link the project, and run `supabase db push`. Next.js does not apply database migrations automatically.

Authentication credentials remain in Supabase Auth. Do not copy passwords or other credentials into application tables. Add RLS policies tied to `auth.uid()` for every future private table.

## Workspace layout

```text
apps/
  web/                   Nexus Next.js application
    app/                 Login, reset callback, and protected workspace routes
    components/          App shell and authentication UI
    lib/supabase/         Browser, server, environment, and session clients
    AUTH_SETUP.md         Detailed Supabase configuration
packages/
  ui/                    Shared UI components, styles, and hooks
  eslint-config/         Shared ESLint configuration
  typescript-config/     Shared TypeScript configuration
supabase/
  migrations/            Supabase SQL migrations
```

The `web` app uses the Supabase SSR browser and server clients. Supabase cookies are refreshed through the app proxy; protected dashboard routes verify the user on the server. `robots.txt` and page metadata discourage indexing, while server-side authentication provides access control.

## Routes

- `/login` — email/password or Google sign-in; password recovery starts inline here
- `/auth/callback` — validates Supabase auth callback codes and establishes the session
- `/reset-password` — protected page for choosing a new password after following a valid recovery link
- `/` — protected workspace dashboard
- `/tasks` — protected tasks page
- `/profile` — protected profile view

## Development commands

Run from the repository root:

| Command                       | Description                                             |
| ----------------------------- | ------------------------------------------------------- |
| `pnpm --filter web dev`       | Start the Next.js development server                    |
| `pnpm --filter web build`     | Build the web application for production                |
| `pnpm --filter web start`     | Start the production build                              |
| `pnpm --filter web lint`      | Lint the web application                                |
| `pnpm --filter web typecheck` | Run the web TypeScript check                            |
| `pnpm lint`                   | Run workspace lint tasks through Turborepo              |
| `pnpm typecheck`              | Run workspace TypeScript checks through Turborepo       |
| `pnpm build`                  | Build all workspace packages and apps through Turborepo |

Shared UI components can be imported from `@workspace/ui`, for example:

```tsx
import { Button } from "@workspace/ui/components/button"
```
