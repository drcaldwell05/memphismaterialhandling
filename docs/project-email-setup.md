# Project request email setup

## Verified release — September 27, 2026

Production sending is enabled. The approved test was delivered only to Russell
at 17:05 UTC (12:05 p.m. Central), with receipt verified in his actual Inbox and
Microsoft message trace. No test was sent to Duane. Normal requests address both
Russell and Duane; Duane's individual receipt was not tested.

Exchange Application RBAC permits only Application Mail.Send from projects.
Russell, Duane, and operations were verified out of the app's sender scope. The
temporary Exchange Administrator role used to complete setup was removed; the
original Global Administrator role remains. Temporary test controls, settings,
and fixture data have been removed. Retired test API links still fail closed.

The Microsoft client credential expires March 26, 2027. Replace it securely in
the Worker's encrypted runtime secret before then; never commit its value.

## Intended delivery

- Sender: Memphis Material Handling `<projects@memphismaterialhandling.com>`
- To: `russell@memphismaterialhandling.com`, `duane@memphismaterialhandling.com`
- Reply-To: the customer's email, when provided
- No additional mailbox license or separately mapped Inbox for recipients.
- External domain MX is a separate mail transition; do not change it for this form.

## Microsoft registration

- Tenant: `425c0726-da86-4408-a0c3-acf3cfbc6978`
- App: MMH Website Project Requests
- Client ID: `7b354021-f9da-4aa7-9c09-a113ad1194f2`
- App object ID: `bb30ce91-e587-455a-9bfd-c026f10da9f4`
- Enterprise application/service principal ID: `6201d355-f352-4f68-9a79-d1419b248ce7`

Use Exchange Application RBAC to give **Application Mail.Send** access to only
the projects shared mailbox. Do not grant tenant-wide Microsoft Graph Mail.Send:
Entra permissions and Exchange RBAC are additive. No mail-reading permission is
needed. Verify the scope includes projects and excludes Russell, Duane, and
operations before enabling the application.

Use the official Exchange Online PowerShell module with an authorized admin
session. The commands below are a prepared plan, not proof they have run:

```powershell
New-ServicePrincipal -AppId 7b354021-f9da-4aa7-9c09-a113ad1194f2 -ObjectId 6201d355-f352-4f68-9a79-d1419b248ce7 -DisplayName 'MMH Website Project Requests'
New-ManagementScope -Name 'MMH Website Projects Sender' -RecipientRestrictionFilter "PrimarySmtpAddress -eq 'projects@memphismaterialhandling.com'"
New-ManagementRoleAssignment -Name 'MMH Website Send Projects' -App 6201d355-f352-4f68-9a79-d1419b248ce7 -Role 'Application Mail.Send' -CustomResourceScope 'MMH Website Projects Sender'
Test-ServicePrincipalAuthorization -Identity 6201d355-f352-4f68-9a79-d1419b248ce7 -Resource projects@memphismaterialhandling.com
Test-ServicePrincipalAuthorization -Identity 6201d355-f352-4f68-9a79-d1419b248ce7 -Resource russell@memphismaterialhandling.com
Test-ServicePrincipalAuthorization -Identity 6201d355-f352-4f68-9a79-d1419b248ce7 -Resource duane@memphismaterialhandling.com
Test-ServicePrincipalAuthorization -Identity 6201d355-f352-4f68-9a79-d1419b248ce7 -Resource operations@memphismaterialhandling.com
```

Inspect existing scopes and assignments first; do not duplicate resources on a
resume. Application permissions may take time to propagate; the test cmdlet
bypasses cached permissions, so live send validation remains necessary.

## Cloudflare configuration

Use only the existing `memphismaterialhandling` Worker and its GitHub build.
Nonsecret settings live in `wrangler.jsonc`. Store the following only as encrypted
**runtime secrets**, never build variables, source files, chat messages, or logs:

- `MS_GRAPH_CLIENT_SECRET`: the new Microsoft application's credential
- `TURNSTILE_SECRET_KEY`: the MMH Project Requests widget's verification secret

Create a managed Turnstile widget restricted to the MMH domain, keep pre-clearance
off, and put its public site key in `TURNSTILE_SITE_KEY`. The client action is
`project_request`; server verification also checks the exact request hostname.

The SQLite Durable Object and rate limiter bindings are deployed from Wrangler
configuration. No customer email contents are retained in their storage.

## Release and verification

1. Finish the scoped Microsoft permission and secret setup.
2. Run `npm test`, `npm run typecheck`, `npm run lint`, and the Wrangler deploy dry run.
3. Publish through GitHub main → existing Cloudflare Workers Builds, initially
   leaving sending disabled.
4. Obtain specific approval for any new live test's recipients and content. The
   current form always addresses both Russell and Duane. Its original acceptance
   test went only to Russell through a temporary path that has since been removed;
   do not reuse old test links or mistake a local mock for a delivered email.
5. Check Microsoft message trace and the approved destination Inbox; Graph 202
   alone does not prove delivery. Confirm the sender, subject, HTML appearance,
   and customer Reply-To. Phone-only handling is verified in local tests.
6. Enable `PROJECT_REQUESTS_ENABLED` through GitHub after delivery is verified.
   Normal requests address Russell **and** Duane. Duane's live receipt was not
   claimed from the original Russell-only acceptance test.
7. Declare setup complete only after delivery is verified. If a live test fails,
   disable sending while investigating. Never replace an actual failure with a
   success screen or leave unverified submissions running unnoticed.

If a send has an uncertain result, investigate the reference in Microsoft's Sent
Items/message trace before initiating a new request. Do not blindly replay it.
Track the Microsoft credential expiration and replace it securely before expiry.

Sources: [Graph sendMail](https://learn.microsoft.com/en-us/graph/api/user-sendmail),
[Exchange Application RBAC](https://learn.microsoft.com/en-us/exchange/permissions-exo/application-rbac),
[Turnstile verification](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
