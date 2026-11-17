# Memphis Material Handling

## Project intake

The public desktop header, homepage, and mobile menu open the original three-step
**Plan a project** form from the ChatGPT version. Visitors can choose their project
needs, enter their details, and review their request without leaving the page.
Staff sign-in is not linked in public navigation while access is unfinished.
The separate Contact page retains its phone number, directions, and opening hours.

The form posts to `/api/project-requests`. The Worker saves each verified
request in the private `mmh-project-requests` Cloudflare D1 database before
asking Microsoft Graph to email Russell, Duane, and Operations. Reply-To is the
customer when they provide an email address. Phone-only requests remain
supported. The sender and recipients are fixed on the server.

Production sending was enabled on September 27, 2026, after the approved test
arrived in Russell's Inbox and Microsoft message trace reported Delivered. The
test went only to Russell. The October 14 routing update verified delivery to
all three inboxes. Intake requires `PROJECT_REQUESTS_ENABLED=true`, a working
database, and the verification settings. Missing Microsoft credentials affect
the notification only. See [the setup checklist](docs/project-email-setup.md).

Requests use server validation, a 24 KB body cap, same-origin checks, a honeypot,
five attempts per IP per minute, and server-verified Turnstile tokens bound to the
site hostname and form action. The database stores the verified request details
and uses the project reference to prevent duplicate sends. Customer details go
in the private database and the notification. Worker logs contain no form answers.

The form confirms a request after it is saved. The database records whether
Microsoft accepted the email or whether delivery failed or remains unconfirmed.
Use the `project_requests` table in Cloudflare D1 Studio to find saved requests.
The email layout is editable in `worker/project-email.ts`.

## Application

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

## Public deployment

The public website deploys from the `main` branch of
`drcaldwell05/memphismaterialhandling` through Cloudflare Workers Builds.

- Worker name: `memphismaterialhandling`
- Build command: `npm test`
- Deploy command: `npm run deploy`
- Root directory: the repository root
- Public domains: `memphismaterialhandling.com` and `www.memphismaterialhandling.com`

`wrangler.jsonc` configures the Cloudflare Worker and static asset binding. The
Cloudflare Vite plugin generates the deployable Worker configuration during the
build. `.openai/hosting.json` remains a reference to the separate private draft;
the public site is deployed by Cloudflare from GitHub.

## Private AOL-copy notices

`MailBridgeAlerts` is a private service entrypoint used by the separate cloud AOL copier and its five-minute status monitor. Failure and credential-renewal notices use only the single approved operator configured in the encrypted `AOL_COPY_ALERT_RECIPIENT` runtime setting. Keep this address out of the repository. Callers cannot supply a recipient or arbitrary email content; an absent recipient fails closed. Normal project-request recipients are independent of this setting.

Keep `AOL_COPY_ALERTS_ENABLED=true` and both `AOL_COPY_TEST_ENABLED` and `AOL_MONITOR_TEST_ENABLED` false during normal operation. The separate monitor stays quiet while healthy. Its one-time synthetic test has a persisted attempt reservation; never re-enable or retry it merely because provider acceptance or Inbox receipt is uncertain.

Both Microsoft application credentials currently expire March 26, 2027. The monitor gives advance renewal notices; it cannot rotate credentials. After an authorized renewal, update the monitor's configured expiration and the sender's validated renewal date together. Preserve the runtime recipient setting and existing encrypted sender credential during future deployments.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: test request validation/delivery behavior, build, and verify rendered pages
- `npm run typecheck`: check TypeScript
- `npm run lint`: check source quality
- `npm run types`: regenerate Cloudflare binding and runtime types
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
