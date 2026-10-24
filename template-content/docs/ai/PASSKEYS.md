# Passkeys / WebAuthn (ASP.NET Core Identity 10)

Passkeys are a **passwordless primary sign-in method**, independent of the existing username/password + authenticator MFA journey. The .NET 10 Identity implementation deliberately treats a successfully verified passkey as strong primary authentication and bypasses a separate TOTP step. It does **not** implement second-factor WebAuthn. Always explain that distinction in security policy and deployment reviews.

## Backend and database

- Set `IdentityOptions.Stores.SchemaVersion = IdentitySchemaVersions.Version3` before building the Identity EF model. Apply `AddPasskeySupport` SQLite migration, which introduces `AspNetUserPasskeys` with the credential ID, owning user ID and Identity-serialized passkey data. The existing user/role schema and their keys remain unchanged.
- The built-in `SignInManager<AppUser>` generates attestation/assertion options, uses a data-protected short-lived one-use cookie, verifies WebAuthn origin, challenge, user verification and signatures, and updates the signature counter. Persist via `UserManager<AppUser>` passkey APIs. Do not implement cryptography in React or persist private keys.
- Identity's WebAuthn ceremony state **shares** `IdentityConstants.TwoFactorUserIdScheme`, whose cookie is restricted to `/api/auth` in this template. Therefore **every** passkey ceremony endpoint lives under `/api/auth/passkeys`; moving an endpoint outside that path requires an explicit secure cookie-path review. A pending passkey state cookie is *not* an authenticated app session.
- Configure `Passkeys:ServerDomain` as the trusted RP ID for production (e.g. `app.example.com`, without scheme/port). Local `localhost` works without configuration. Outside Development, enrollment and login ceremonies return 503 until `Passkeys:ServerDomain` is provided (existing password login remains available). When omitting the RP ID, the host header is used; deploy trusted hosts/forwarded headers and set `AllowedHosts` appropriately. Never trust arbitrary Host or X-Forwarded-Host.
- User verification and discoverable resident keys are both **required**; a user can start a passwordless sign-in without identifying their username. For production use HTTPS and a platform authenticator/compatible password manager.

## API endpoints

| Method | Route | Authorization |
| --- | --- | --- |
| GET | `/api/auth/passkeys` | Authenticated: list only own passkey names, IDs, dates and backup status |
| POST | `/api/auth/passkeys/create-options` | Authenticated + re-verify current password: create one-use attestation options |
| POST | `/api/auth/passkeys/register` | Authenticated + attestation cookie: verify challenge/credential **and matching user ID**, then store |
| POST | `/api/auth/passkeys/remove` | Authenticated + current password + own credential ID |
| POST | `/api/auth/passkeys/request-options` | Public, rate-limited discoverable-credential assertion options |
| POST | `/api/auth/passkeys/login` | Public, rate-limited verified passkey sign-in; 204 on success |

All POSTs use same-origin antiforgery validation via `X-CSRF-TOKEN` even when public. Enrollment and deletion are throttled at the MFA rate. Public login/options use the login limiter. Validation errors do not expose user existence. Registration only stores a passkey whose signed user entity ID matches the currently authenticated account. The client never stores a credential or challenge in localStorage.

## React flow

- **Account / Passkeys**: add with a friendly name and current password, respond to `navigator.credentials.create`, list existing entries, remove only after password re-verification.
- **Login**: "ورود با Passkey" invokes `navigator.credentials.get` and completes the authenticated session without entering username/password. Username/password/MFA remain available unchanged.
- Uses browser `PublicKeyCredential.parseCreationOptionsFromJSON` and `parseRequestOptionsFromJSON`, with explicit base64url serialization to avoid the known `toJSON` Illegal invocation issue in some password managers.
- Unsupported or insecure browsers show explanatory disabled controls; cancel/timeout surfaces recoverable feedback.

## Tests / known limits

- xUnit validates Identity v3 migration, per-account key visibility/removal, password re-verification, CSRF and protected endpoints, and public options availability.
- Vitest validates browser ceremony option calls, credential serialization, account enrollment/removal UI and existing login flows.
- An actual Windows Hello/Touch ID/security-key ceremony requires manual QA in an HTTPS browser with a real or virtual authenticator. Do not claim a hardware end-to-end test from the fake stored-credential integration test.
- No credential attestation trust-chain policy, conditional autofill, org-wide passkey enforcement, credential recovery workflow, SMS, or external OIDC is included. If a deployment requires both a passkey and mandatory TOTP, design a **separate** step-up policy: built-in `PasskeySignInAsync` bypasses TOTP by design.
