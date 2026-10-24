# Agent Entry Point — Mkx React

Read before editing. Follow explicit user requirements and these repository policies. Relevant guides are under `docs/ai/`: ARCHITECTURE, FEATURE_WORKFLOW, SECURITY, UI and VERIFICATION.

Search for a matching reference feature before introducing a new service, abstraction, route or CSS primitive. Domain owns business invariants; Application owns use cases and interfaces; Infrastructure owns EF Core/Identity persistence; Server owns HTTP security and composition; React owns typed feature-based presentation. Avoid generic repository boilerplate, MediatR, multiple HTTP clients, global state libraries without need, and mandatory UI-kit lock-in.

Never place database access or secrets in React. Enforce API authorization server-side, not only with UI hiding. For cookie-authenticated unsafe `/api` requests send antiforgery tokens. Keep TypeScript strict, remote state in TanStack Query, shared HTTP transport under `src/Client/src/shared/api`, and feature-local components. Maintain RTL, accessibility, focus and reduced-motion behavior.

Update both sides of an API contract together; publish typed endpoint response metadata and regenerate TypeScript declarations following `docs/ai/OPENAPI_CONTRACTS.md`. Include domain/API/client tests, update affected docs, and run `./scripts/verify.ps1` before claiming completion. Packaging changes require the root `./scripts/verify-template.ps1`. Never commit generated folders, default admin credentials or secrets.

## Cross-template compatibility

Read `docs/ai/PARITY_ROADMAP.md` before changing policy names, roles, claim semantics, theme palette identifiers or shared feature contracts. Maintain `Administrators`/`Users` built-in roles and claim-type-as-policy-name behavior. Add tests for authorization and role claim propagation.

## Reusable UI contract

For UI work read docs/ai/REUSABLE_COMPONENTS.md first. Prefer shared/ui primitives over duplicate dialog, select, field, toast and table implementations. Keep sample showcase at /components useful and tested; do not introduce a mandatory UI kit to feature code.

## Account management contract

For user lifecycle changes read docs/ai/USER_ADMINISTRATION.md. For self-service account/password recovery changes read docs/ai/ACCOUNT_SELF_SERVICE.md. For authenticator MFA changes read docs/ai/MFA.md; for passkey changes read docs/ai/PASSKEYS.md; for external authentication changes read docs/ai/EXTERNAL_OIDC.md. Protect Administrators and caller account on the server, prohibit elevation via generic roles endpoint, keep policy authorization and CSRF, and test the API and UI together.

## Authentication and account UI

Keep login username/password (not email lookup) in API, tests and React. Preserve independent username/email fields, role and policy checks, antiforgery, and development-only admin/admin compatibility. Read docs/ai/SECURITY.md and docs/ai/USER_ADMINISTRATION.md before modifying identity behavior.
