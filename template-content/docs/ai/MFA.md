# Authenticator MFA and recovery codes

This optional second-factor milestone uses ASP.NET Core Identity's built-in TOTP authenticator provider and recovery-code store. It does not require a new database table or migration. It is independent of business roles and policies: each signed-in user controls only their own factor enrollment.

## Lifecycle

1. Open `/account`, enter current password in the MFA setup dialog.
2. Server returns the enrollment key and standard `otpauth://` URI **only for that authenticated, re-verified account**. The React UI renders an entirely local QR code using `qrcode.react` (no QR provider/network request).
3. Scan with any RFC 6238-compatible app and confirm a six-digit code. Server enables two-factor and issues 10 one-time backup codes.
4. Save backup codes. They are returned on setup/regeneration only and are never persisted by the React UI.
5. On subsequent username/password login, the API returns HTTP 202 with `requiresTwoFactor: true`; the UI transitions to `/login/2fa`. A short-lived, HttpOnly Identity two-factor cookie carries pending login identity; it is *not* the application session. A valid six-digit code (or unused recovery code) completes sign-in.
6. In `/account`, regeneration or disabling requires both current password and an authenticator code or one-time recovery code. Regeneration invalidates prior backup codes. Disabling rotates the authenticator secret and stops MFA on subsequent logins.

## API contract

| Method | Route | Guard |
| --- | --- | --- |
| GET | `/api/account/mfa/status` | Authenticated |
| POST | `/api/account/mfa/setup` | Authenticated + current password |
| POST | `/api/account/mfa/enable` | Authenticated + current password + TOTP |
| POST | `/api/account/mfa/recovery-codes` | Authenticated + password + TOTP/recovery |
| POST | `/api/account/mfa/disable` | Authenticated + password + TOTP/recovery |
| POST | `/api/auth/2fa` | Pending 2FA cookie + TOTP/recovery |

All POST endpoints use same-origin CSRF validation. Sensitive MFA endpoints are additionally throttled by IP (10 attempts in 10 minutes); failed login TOTP attempts flow through Identity lockout. Recovery codes are redeemed once. Authorization is enforced by the Server, not by hiding React controls.

## Cookie and configuration

The additional `IdentityConstants.TwoFactorUserIdScheme` cookie is HttpOnly, SameSite Strict, Secure in Production, restricted to `/api/auth`, and expires after 5 minutes without sliding expiration. A pending two-factor cookie does **not** satisfy `RequireAuthorization()` for protected routes. The `Mfa:Issuer` config key optionally changes the label in authenticator apps; its default is `Mkx Workspace`. Do not store authenticator secrets, recovery codes, or QR data in logs, analytics, browser persistence or test snapshots.

When using `admin/admin` in isolated Development, the original credentials stay unchanged; enabling MFA for that local account intentionally makes the second factor mandatory for subsequent logins. Production never seeds demo credentials.

## Verification

`AuthenticatedCrudTests.AuthenticatorMfa_RequiresPasswordAndCode_AndRecoveryCodesWorkOnce` exercises enrollment, bad password, Identity TOTP, authenticated route denial during pending challenge, recovery-code login, regeneration and disable. React tests cover Persian-digit OTP submission and recovery-code UI. Verify generated template with `scripts/verify.ps1` and repository `scripts/verify-template.ps1`.

## Not included

Passkeys/WebAuthn, external OIDC providers, SMS OTP, trusted-device bypass and organization-wide MFA enforcement are future milestones. For deployments with strong incident response requirements, consider immediate revocation beyond the standard five-minute security-stamp interval.
