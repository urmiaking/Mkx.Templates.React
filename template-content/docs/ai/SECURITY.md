# Security
ASP.NET Core Identity HttpOnly same-origin application cookie and CSRF request header X-CSRF-TOKEN for all unsafe /api requests. Do not store bearer credentials in localStorage. Login is rate limited; sample writes use server-side authorization; business roles require explicit policies. Bootstrap disabled by default; provide initial secret out of band and disable after creation. Persist Data Protection keys and configure trusted reverse proxy headers/HTTPS. Authenticator MFA with recovery codes is implemented (see docs/ai/MFA.md). Passkeys, OIDC and audit remain future modules. Self-service profile, password change and email-based recovery are implemented with an optional SMTP email sender; see docs/ai/ACCOUNT_SELF_SERVICE.md. Guarded user administration is implemented; see docs/ai/USER_ADMINISTRATION.md.

## Capabilities

Policy grant is an Identity Claim whose **Type** equals the registered policy name (same as Blazor); the value is `true`. `Administrators` bypasses explicit capabilities. User and role mutations are server-gated by Users.View / Users.Manage / Users.ManageClaims. Admin role direct permissions cannot be changed through the generic endpoint. Permission changes invalidate security stamps and are recognized after normal stamp validation or new login.

## Username login and local demo

Login accepts username and password (not email). UserName and Email are stored independently; the latter remains contact information. Existing users created before this change keep their email-shaped usernames, so there is no destructive migration. Identity cookies, CSRF, rate-limiting and account lockout remain enforced.

The Development-only demo (Bootstrap:DevelopmentAdmin:Enabled) provisions username admin and password admin, with the Administrators role. The account is only created if username admin does not exist; it does not reset an existing user's password or silently promote existing users. It uses a runtime-generated password hash and never provisions this demo in Production. This intentionally weak account is for isolated localhost development only. Production requires Bootstrap:Enabled plus AdminUserName, AdminEmail and a strong AdminPassword supplied through secrets.
