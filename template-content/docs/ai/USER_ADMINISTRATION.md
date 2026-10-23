# React user administration — lifecycle milestone

The public React template ships a permission-gated `/users` management workspace (two-pane responsive user selection and details). The UI is feature-scoped to `src/Client/src/features/users`, uses the shared `Dialog`, `ConfirmDialog`, `Form`, `Field`, `TextInput`, `CheckBox`, and `useToast`, and implements loading/empty/error states, search, server-side pagination and theme/RTL/mobile styling.

## Capabilities

- List/search users using server-side paging (20 per page); details show email-confirmed status, account locked status, role memberships and direct policy grants.
- Create member account with role `Users` and an Identity-policy-compliant initial password.
- Edit email (username updated with it, email confirmation reset).
- Temporarily disable an account with an Identity lockout end date; enable it again and reset failed-login attempts.
- Add/remove membership of **only** the `Users` role (not arbitrary role names and never `Administrators`).
- Edit direct registered claims and `Users` role policies; invalidate security stamps to refresh authorization.
- Permanently delete a non-protected account using an accessible asynchronous confirmation dialog.

## Backend routes and authorization

Routes live in `Server/Endpoints/UserLifecycleEndpoints.cs` and use the existing `/api/admin` group, authentication cookie and antiforgery middleware.

| Method | Route | Required policy |
| --- | --- | --- |
| `GET` | `/api/admin/users?skip=&take=&search=` | `Users.View` |
| `POST` | `/api/admin/users` | `Users.Manage` |
| `PUT` | `/api/admin/users/{id}/account` | `Users.Manage` |
| `PUT` | `/api/admin/users/{id}/lock` | `Users.Manage` |
| `DELETE` | `/api/admin/users/{id}` | `Users.Manage` |
| `PUT` | `/api/admin/users/{id}/roles` | `Users.ManageClaims` |
| `PUT` | `/api/admin/users/{id}/permissions` | `Users.ManageClaims` |
| `GET` | `/api/admin/roles` | `Users.View` |
| `PUT` | `/api/admin/roles/Users/permissions` | `Users.ManageClaims` |

The **server** rejects all account lifecycle mutations targeting the caller's own account or any member of `Administrators`. The only mutable membership is `Users`, preventing privilege escalation through this generic surface. No automatic administrator role management is offered. The client also hides protected operations, but this is only a usability measure. Unknown permissions and role names are rejected. Identity operations use UserManager and RoleManager rather than modifying EF tables directly.

Account lockout rejects new password sign-ins. Existing authentication cookies may remain valid until the regular Identity security-stamp validation window expires (currently five minutes); require a custom strict revocation mechanism if a deployment requires instant termination of all sessions. Email changes reset email confirmation without implicitly making confirmation required to sign in; evaluate provider-specific sign-in policy separately.

## Verification

The backend's `AuthenticatedCrudTests.AccountLifecycle_ProtectsAdministratorsAndSelf_AndEnforcesPolicies` covers protected accounts, policy enforcement, forbidden elevation, email changes, role membership, lock/unlock, rejected login and deletion. Client Vitest tests exercise validation and interactive administrator/member actions. Run the root `./scripts/verify-template.ps1` before release to ensure the NuGet template produces a working rebranded solution.

## Not yet implemented

Self-service account profile and password changes, email verification delivery and password recovery, MFA/OTP and passkeys, external OIDC, audit event persistence, bulk account import, advanced multi-role administration, email notifications and bulk selection. These require separate milestones and must not be claimed as delivered by this user-administration milestone.

## Independent usernames

Login is username/password. User listing searches username and email, and creation/editing includes both independent fields. Editing an email resets its confirmation, editing a username does not. Legacy email-shaped usernames continue to work; an old email-only client request updates username only if username previously equaled email. Development-only admin/admin is provided for local demo; Production bootstrap requires an explicitly supplied strong administrator.
