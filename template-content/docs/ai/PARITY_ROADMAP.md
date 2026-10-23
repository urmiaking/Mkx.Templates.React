# Mkx Templates: Blazor ↔ React capability parity

The two templates are **independent repositories and distribution packages**, but intentionally share conventions for the application core. Parity means equivalent behavior/contracts, **not** identical component runtimes.

## Shared baseline — implemented

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
| RTL workspace, dark/light and four semantic palettes | Supported | Supported (separate UI) |
| Progressive agent documentation and verification | Supported | Supported |

The React backend uses explicitly registered policies rather than Blazor's dynamically provided policy registry. Both fail closed. A React Administrator bypasses individual policy claims through the registered authorization handler. The React session endpoint returns the current cookie's effective policy list; authoritative authorization remains on the Server. Identity security stamps are checked periodically, so role/claim changes may require a fresh login before React navigation catches up.

## Important differences and not-yet-implemented parity

| Area | Status / next work |
| --- | --- |
| Full user edit/delete, role membership editor and account protection | React has creation/listing/permission updates only; extend with guarded lifecycle operations |
| Account profile, password change/recovery, MFA/passkeys, OTP/SMS | Not yet ported to React |
| External OIDC/BirSign sign-in | Not yet ported to React |
| Blazor native dialog/form/table/toast primitives | Design **React equivalents**, not a component-by-component port |
| Notifications, mobile bottom navigation, advanced appearance picker | Not yet implemented in React |
| SQL Server provider-specific migrations | Runtime provider hook exists; migrations currently SQLite-specific |
| OpenAPI-generated strongly typed TypeScript client | Contracts currently updated manually; add deterministic generation + CI drift check |
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

Implement reusable form/dialog/toast/table foundations in React, complete secure account administration, then identity recovery/MFA and optional OIDC. Add OpenAPI-generated TypeScript contracts before multiplying business features. For each milestone, keep the independent Blazor code untouched unless an explicitly approved shared-contract change is necessary.
