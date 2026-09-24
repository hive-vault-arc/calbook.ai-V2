# Vercel Hobby staging

Use Vercel Hobby only for private prelaunch testing. The active `apps/web/vercel.json` intentionally omits cron jobs because Hobby rejects schedules that run more than once per day. The required production schedules remain in `apps/web/vercel.production.json` and must be restored or replaced with an external scheduler before launch.

## Project configuration

Import this repository into Vercel with the following project settings:

| Setting | Value |
| --- | --- |
| Framework preset | Next.js |
| Root Directory | `apps/web` |
| Include source files outside Root Directory | Enabled |
| Build Command | `cd ../.. && yarn build` |
| Install Command | Default |
| Output Directory | Default |

## Required environment variables

Configure these for Production, Preview, and Development unless a narrower scope is intentional:

- `DATABASE_URL`
- `DATABASE_DIRECT_URL`
- `NEXTAUTH_SECRET`
- `CALENDSO_ENCRYPTION_KEY`
- `ALLOWED_HOSTNAMES`
- `NEXT_PUBLIC_SUPPORT_MAIL_ADDRESS`
- `CALCOM_TELEMETRY_DISABLED=1`

The initial deployment can derive its URL from Vercel. After Vercel assigns the stable staging domain, set both `NEXT_PUBLIC_WEBAPP_URL` and `NEXTAUTH_URL` to that exact HTTPS origin, update `ALLOWED_HOSTNAMES` to contain only its hostname, and redeploy.

Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` once the Upstash staging database exists. Email and calendar-provider variables can follow after the core deployment is healthy.

Never copy local `.env` files into Vercel or paste secret values into deployment logs, tickets, or chat.

## Staging limitations

- Automatic cron execution is disabled. Exercise protected cron routes manually during acceptance testing.
- Database migrations are not run by the Vercel build. Apply migrations through a controlled release job before deploying schema-dependent code.
- Hobby is not the production target for a commercial CalBook.ai launch.
