# External OpenID Connect (OIDC)

The React template offers **one optional generic OIDC provider**; no vendor-specific adapter is required. OIDC is disabled by default and does not replace local username/password, TOTP or passkeys.

## Configuration

Register a confidential web client with the provider and allow the exact callback URI **`https://app.example.com/signin-oidc`**. Supply credentials through environment variables or a secret manager, never source control:

```text
ExternalOidc__Enabled=true
ExternalOidc__Authority=https://identity.example.com
ExternalOidc__ClientId=your-web-client
ExternalOidc__ClientSecret=<private secret>
ExternalOidc__DisplayName=ورود سازمانی
```

- HTTPS Authority is mandatory in Production; HTTP is allowed only in Development. When enabled, missing or invalid settings fail at startup.
- The ASP.NET Core OIDC middleware handles code flow + PKCE, nonce, correlation, signed token validation and OIDC discovery. The standard scopes are `openid`, `profile`, `email`. No offline/refresh tokens are requested; `SaveTokens=false`.
- The temporary HttpOnly `Identity.External` cookie lasts five minutes, is restricted to `/api/auth/external`, and is consumed when a local Identity session is established. No external access/refresh tokens are persisted.
- For Nginx/IIS reverse proxies, set trusted `ReverseProxy:KnownProxies`, `AllowedHosts`, HTTPS forwarding and persistent Data Protection keys. The public `/signin-oidc` redirect URI must match the provider registration exactly.

## Account linking and security

External identities are **never matched by email** and never auto-create a local account. A user first signs in with their local username/password, enters the current password on `/account`, and explicitly links their OIDC subject. The server uses `SignInManager.ConfigureExternalAuthenticationProperties` with the current user ID as the XSRF binding; only a validated OIDC callback can create an Identity `AspNetUserLogins` link. Duplicate provider subjects cannot be linked to another account; an account can link one identity from this configured provider.

Later OIDC sign-ins resolve the local account by `(provider, subject)`, enforce local Identity lockout and use the existing TOTP path if enabled. External role/admin/permission/email claims are **not imported** into the local principal. Accounts must be provisioned locally through approved administration.

Unlink requires the local password and removes only that external-login mapping. Local password sign-in stays available. Disabling OIDC removes login/link UI but does not delete an existing mapping; unlink remains available. Logout clears the local cookie only, **not** the provider SSO session. There is no automatic single logout.

## Endpoints

| Method | Route | Security |
| --- | --- | --- |
| GET | `/api/auth/external/config` | Public; only enabled/displayName |
| GET | `/api/auth/external/start` | Public, rate limited, full-page OIDC challenge |
| GET | `/api/auth/external/callback` | Public, consumes temporary provider cookie |
| GET | `/api/account/external` | Signed-in user's mapping status |
| POST | `/api/account/external/link` | Signed-in browser form + antiforgery hidden field + current password + throttle |
| GET | `/api/auth/external/link-callback` | Signed-in, per-user Identity XSRF + throttle |
| POST | `/api/account/external/unlink` | Signed-in + CSRF + current password + throttle |

The linking form uses a top-level POST because a fetch request cannot follow the provider's cross-origin authentication navigation. OIDC callback redirects use only fixed local routes, never an untrusted return URL.

## Verification and known limits

Integration tests inject a **test-only authenticated external cookie** as the result of a hypothetical successful OIDC middleware handshake. They test account ownership, form-CSRF/password protection, mismatch/XSRF refusal, external-subject collision, sign-in/lockout behavior, ignoring malicious IdP role claims and unlink. React tests check conditional sign-in and account UX. The synthetic cookie test does **not** prove an actual provider's metadata retrieval, code exchange, signature/correlation and logout journey; carry out a separate manual HTTPS end-to-end test with a real provider. The test-only middleware is never present in deployed applications.
