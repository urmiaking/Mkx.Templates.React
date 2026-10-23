# Security
ASP.NET Core Identity HttpOnly same-origin application cookie and CSRF request header X-CSRF-TOKEN for all unsafe /api requests. Do not store bearer credentials in localStorage. Login is rate limited; sample writes use server-side authorization; business roles require explicit policies. Bootstrap disabled by default; provide initial secret out of band and disable after creation. Persist Data Protection keys and configure trusted reverse proxy headers/HTTPS. MFA/OIDC, audit and account administration are intentionally future modules.

## Capabilities

Policy grant is an Identity Claim whose **Type** equals the registered policy name (same as Blazor); the value is `true`. `Administrators` bypasses explicit capabilities. User and role mutations are server-gated by Users.View / Users.Manage / Users.ManageClaims. Admin role direct permissions cannot be changed through the generic endpoint. Permission changes invalidate security stamps and are recognized after normal stamp validation or new login.
