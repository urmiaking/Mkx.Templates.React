# React user administration lifecycle

When touching `/users`, Identity membership, user management policies or account lifecycle:

1. Read `AGENTS.md`, `docs/ai/SECURITY.md`, `docs/ai/PARITY_ROADMAP.md`, `docs/ai/USER_ADMINISTRATION.md`, and `docs/ai/REUSABLE_COMPONENTS.md`.
2. Keep role names `Administrators` and `Users`, and keep policy claim **types** aligned across the server, contracts and React.
3. The server must reject lifecycle operations against Administrators and the calling user's account. Generic account management can only toggle **Users** membership; never expose admin elevation here.
4. Use ASP.NET Core `UserManager` and `RoleManager` and enforce Users.View / Users.Manage / Users.ManageClaims server-side. Do not rely on UI hiding as authorization.
5. Preserve antiforgery validation for unsafe cookie-authenticated requests, security-stamp invalidation, unique email checks, appropriate error status, and non-disclosure of credentials.
6. Keep feature-local typed API calls, Zod validation, TanStack Query for server state, Dialog/ConfirmDialog/Form/Toast for UX, and mobile/RTL theme tokens.
7. Add xUnit tests of successful member operations **and denied privilege escalation**. Add Vitest tests of the UI states and guard conditions.
8. Run `./scripts/verify-template.ps1` from the packaging repository before release. Publishing is automatic from successful `main` CI; do not create version bump commits.
9. Treat profile/password recovery, MFA, passkeys, external OIDC, audit logging and strict instantaneous cookie revocation as separate, explicitly planned milestones; do not claim them as completed.
