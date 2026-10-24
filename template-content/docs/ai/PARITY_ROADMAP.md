# Mkx Templates: Blazor â†” React capability parity

The two templates are **independent repositories and distribution packages**, but intentionally share conventions for the application core. Parity means equivalent behavior/contracts, **not** identical component runtimes.

## Shared baseline â€” implemented

| Capability | Blazor | React |
| --- | --- | --- |
| .NET 10 host and project template via NuGet | Supported | Supported |
| Domain, Application, persistence, HTTP, UI separation | Supported | Supported |
| ASP.NET Core Identity cookie login and antiforgery | Supported | Supported |
| Built-in roles | `Administrators`, `Users` | Same |
| Policy names for Users.View/Manage/ManageClaims | `Mkx.Templates-Users-*` | Same |
| Sample feature View/Manage policy names | `Mkx.Templates-SampleItems-*` | Same |
| Permission representation | Claim **type** is policy name | Same |
| Server-side denial of missing or unknown permissions | Supported | Supported |
| User listing / creation / direct claim assignment | Supported | Supported |
| Role permission editing | Supported | Supported for `Users` (not `Administrators`) |
| Cookie role security-stamp invalidation on permission changes | Supported | Supported |
| Sample reference CRUD + concurrent edit detection | Supported | WorkItems sample |
| RTL workspace, dark/light and four semantic palettes | Supported | Supported; Blazor-matched tokens and radial animations |
| Progressive agent documentation and verification | Supported | Supported |

The React backend uses explicitly registered policies rather than Blazor's dynamically provided policy registry. Both fail closed. A React Administrator bypasses individual policy claims through the registered authorization handler. The React session endpoint returns the current cookie's effective policy list; authoritative authorization remains on the Server. Identity security stamps are checked periodically, so role/claim changes may require a fresh login before React navigation catches up.

React also matches Blazor's draggable left-edge palette picker, persisted mobile visibility and independent identity/recovery layout. The two UI runtimes remain separate implementations with equivalent appearance behavior.

## Important differences and not-yet-implemented parity

| Area | Status / next work |
| --- | --- |
| Full user edit/delete, role membership editor and account protection | React now has guarded member account editing, deletion, lock/unlock, Users membership and permission updates; advanced role management remains separate |
| Account profile, password change/recovery, MFA/passkeys, OTP/SMS | React self-service profile, email confirmation, password recovery, authenticator MFA and Identity 10 WebAuthn passkeys implemented; SMS remains |
| Generic external OIDC sign-in | React supports one optional standards-based provider with explicit Identity account linking; provider-specific integrations are outside the starter |
| Blazor dialog/form/table/toast/OTP primitives | **Phase 1 baseline implemented**: Dialog, ConfirmDialog, Form/Field, Select, OTP, DataTable, Toast, Button/IconButton, Breadcrumbs; refine feature-specific patterns as needed |
| Notifications, mobile bottom navigation | Not yet implemented in React |
| SQL Server provider-specific migrations | Runtime provider hook exists; migrations currently SQLite-specific |
| OpenAPI-generated strongly typed TypeScript client | Build-time schema generation, typed WorkItems + user administration + account self-service clients and local/CI drift check implemented; authentication/MFA/passkey response metadata remains |
| Optional sample feature parameter | React currently includes sample WorkItems by default; optional flag requires tested generation logic |
| Identity claims/roles management at large organizational scale | Requires paging/search improvements, role assignment flows and audit logs |
| Production readiness | Configure deployment-specific security, identity lifecycle, secrets, persistent key ring, backups, and integration tests |

## Reference policy contract

- `Mkx.Templates-Users-View`
- `Mkx.Templates-Users-Manage`
- `Mkx.Templates-Users-ManageClaims`
- `Mkx.Templates-SampleItems-View`
- `Mkx.Templates-SampleItems-Manage`

Each granted capability is an Identity claim whose **Claim.Type** equals the policy name. The claim value can be `true`. Role claims contribute to the principal. Use the shared definitions in `src/Contracts/*/Authorization/AppPolicies.cs`; the TypeScript names in `features/users/users.api.ts` must match. The `dotnet new` sourceName transformation renames the `Mkx.Templates` prefix consistently across C# and TypeScript in newly generated solutions.

## Next milestone

Reusable UI primitives, guarded account administration, profile editing, email verification and password recovery are implemented. Next: cover authentication/MFA/passkey response metadata and typed-client migration, then broader account security and UI parity before multiplying business features. For each milestone, keep the independent Blazor code untouched unless an explicitly approved shared-contract change is necessary.

## Username parity

React now signs in using username and password like Blazor. Username and email are separate properties. Development may seed a demo admin/admin account; Production never seeds demo credentials.
