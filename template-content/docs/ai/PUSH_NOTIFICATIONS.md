# Web Push infrastructure (React)

The template includes root-scoped Push-only service worker at src/Client/public/push-sw.js, a typed React feature in src/Client/src/features/push, authenticated anti-forgery API endpoints, EF Core subscriptions, and server-side WebPush. No HTML, account data or API responses are cached by the worker.

## Configure VAPID

Run from the generated solution root:

    ./scripts/generate-vapid.ps1 -Subject 'mailto:ops@example.org'

This generates a unique VAPID key pair in src/Server/<name>.Server/appsettings.Push.local.json. That file is ignored by Git and excluded from NuGet template contents. Never include PrivateKey in frontend code or repositories. For production configure Push__Enabled, Push__Subject, Push__PublicKey and Push__PrivateKey through secret-backed configuration. Do not rotate the pair after devices subscribe unless you intend to resubscribe them.

## Send from trusted server code

Apply the AddWebPushSubscriptions EF migration first. This template's checked-in migration targets SQLite; create a SQL Server provider-specific migration for a SQL Server deployment. Inject IPushNotificationSender (Mkx.Templates.Application.Notifications) into trusted server-side business logic:

    await sender.SendToUserAsync(userId, new PushNotificationMessage("عنوان", "پیام", "/work-items", "event-123"), ct);

Accepted is provider acceptance, not guaranteed device delivery. Revoked counts dead endpoints; Rejected is provider refusal; Unknown indicates transport uncertainty. Business-critical events need their own transactional outbox, idempotency and retries, not included in the starter.

## Security and browser behavior

Authenticated GET /api/push/configuration returns only Enabled and PublicKey. POST and DELETE /api/push/subscriptions register or revoke an endpoint owned by the authenticated account, with normal CSRF. No arbitrary-user send endpoint is exposed. Push provider hosts are allowlisted to mitigate SSRF. Only one user can own an endpoint; 20 devices per user. Logout also unsubscribes the current browser. Permission requests happen only from a user click; already-granted devices may resubscribe silently unless opted out. Notification clicks only navigate within the same origin. Never include private business data in browser-visible payloads.

Push requires HTTPS (localhost accepted during development). iOS/iPadOS requires a Home Screen installed web app; brand-specific bitmap icons should be provided for optimal cross-device installation. This template ships a Web App Manifest with the existing SVG starter icon. The service worker does not implement offline caching.

## Checks

Generated solution: scripts/verify.ps1. Packaging repository: scripts/verify-template.ps1. These verify .NET, OpenAPI-generated TypeScript contracts, React test/lint/typecheck/build and NuGet install/generation. Live Push receipt on HTTPS and physical devices remains an integration test.
