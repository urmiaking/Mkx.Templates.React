# Self-service account and password recovery

This React milestone complements the administration lifecycle without extending generic administrator privileges. All account mutations use ASP.NET Core Identity, same-origin cookies, server-side validation, and the shared CSRF transport. Built-in username login remains independent from email. No database migration is required.

## UI routes

- `/account`: authenticated profile (username/email), current password change, email confirmation request.
- `/forgot-password`: email-based recovery request with an enumeration-resistant generic acknowledgment.
- `/verify-email?userId=...&token=...`: user-initiated email confirmation.
- `/reset-password?email=...&token=...`: token-based password reset.

## API

| Route | Auth | Behavior |
| --- | --- | --- |
| `GET /api/account/profile` | Signed in | Username, email, confirmation state |
| `PUT /api/account/profile` | Signed in | Edit own username/email; email change clears confirmation |
| `POST /api/account/password` | Signed in | Verify current password, enforce Identity strength, refresh caller cookie |
| `POST /api/account/verify-email/request` | Signed in | Mail a confirmation token |
| `POST /api/account/verify-email` | Token | Confirm email with Identity token |
| `POST /api/account/forgot-password` | Public | Returns 202 for known/unknown email; mails only confirmed accounts when configured |
| `POST /api/account/reset-password` | Token | Reset via Identity's expiring, security-stamp-aware token |

All non-GET calls require the CSRF header. Public recovery/verification endpoints are rate limited by IP (8 requests per 10 minutes). Neither passwords nor verification/reset tokens are returned to frontend API consumers, placed in logs, or stored in client-side storage. The intended link itself carries a short-lived Identity token.

## Configure email delivery

The starter does **not** silently provide email delivery. Configure these keys using environment variables or a secret manager, never commit credentials:

```text
AccountEmail__PublicBaseUrl=https://app.example.com
AccountEmail__Host=smtp.example.com
AccountEmail__Port=587
AccountEmail__FromAddress=no-reply@example.com
AccountEmail__UserName=<smtp account>
AccountEmail__Password=<secret>
```

`PublicBaseUrl` is the trusted public **origin** (no path, query or fragment), and must use HTTPS except for an explicit Development HTTP origin. SMTP uses STARTTLS. Replace `IAccountEmailSender` through DI to integrate a managed email provider. Without email configuration, password-recovery requests still return the same 202 response (to avoid account enumeration), while attempts to change email or request verification are rejected visibly. A registered but unconfirmed account must request confirmation before password recovery can be used. When email delivery fails, the recovery endpoint still returns a generic response and logs only the delivery failure.

## Security and limitations

The Production template never provisions demo credentials; Development keeps the intentionally weak `admin/admin` local demo unchanged. Existing sessions are checked against security stamps on the configured five-minute interval; an incident-response system requiring immediate global revocation needs additional session infrastructure. A production deployment should protect recovery pages from referrer leaks and ensure SMTP and publicly configured origin are reachable. MFA, passkeys and generic external OIDC are available as separate opt-in/independent modules; see docs/ai/MFA.md, docs/ai/PASSKEYS.md and docs/ai/EXTERNAL_OIDC.md.

## Verification

- `AuthenticatedCrudTests.SelfService_RequiresAuthentication_AndSupportsPasswordAndVerifiedRecovery` covers authentication, current-password checks, profile editing, email verification, enumeration resistance, and password reset.
- Client Vitest covers profile interactions and Identity-compatible password rules.
- Run `scripts/verify.ps1` followed by repository `scripts/verify-template.ps1` for a complete installed-template check.
