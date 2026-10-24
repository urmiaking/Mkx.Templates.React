# Mkx.Templates — React + ASP.NET Core Hosted

A React SPA in `src/Client` served as static files by one ASP.NET Core 10 host on publish. During development run Kestrel and Vite separately for HMR. Generated UI defaults to Persian RTL with light/dark tokens and no mandatory UI framework.

## Develop

From the generated solution directory (two terminals):

```powershell
dotnet run --project src/Server/Mkx.Templates.Server
# API http://localhost:5080
```

```powershell
cd src/Client
npm ci
npm run dev
# UI http://localhost:5173; /api and /health proxy to Kestrel
```

## Initialize identity safely

No default password, public registration, or unprotected initial-admin endpoint exists. For a new local database, set private .NET user secrets on the Server project:

```powershell
dotnet user-secrets set "Bootstrap:Enabled" "true" --project src/Server/Mkx.Templates.Server
dotnet user-secrets set "Bootstrap:AdminEmail" "admin@example.com" --project src/Server/Mkx.Templates.Server
dotnet user-secrets set "Bootstrap:AdminPassword" "<private strong password>" --project src/Server/Mkx.Templates.Server
```

Start the Server once, then disable Bootstrap and delete the password secret. In production, use a secret manager. Persist EF database and Data Protection keys on deployment.

## Publish

```powershell
dotnet publish src/Server/Mkx.Templates.Server -c Release -o ./artifacts/publish
dotnet ./artifacts/publish/Mkx.Templates.Server.dll
# or: docker build -t mkx-react .
```

Publish runs `npm ci` and `npm run build`, then includes built frontend assets in ASP.NET Core's `wwwroot`. No Node runtime in production. APIs live at `/api/*`; SPA routes fall back to `index.html` and unknown API routes return 404. Set up HTTPS and trusted forwarded headers for reverse proxy deployment.

## DB and migrations

SQLite is the validated starter provider. `Database:ApplyMigrationsOnStartup` is enabled in Development and disabled in Production. Manage migrations with:

```powershell
dotnet ef migrations add FeatureName --project src/Infrastructure/Mkx.Templates.Infrastructure --startup-project src/Server/Mkx.Templates.Server --output-dir Persistence/Migrations
dotnet ef database update --project src/Infrastructure/Mkx.Templates.Infrastructure --startup-project src/Server/Mkx.Templates.Server
```

A SQL Server provider option exists, but **SQLite migrations are not valid SQL Server migrations**. Introduce SQL Server-specific migrations before enabling SQL Server; never apply SQLite scripts to SQL Server.

## Verify

```powershell
./scripts/verify.ps1
```

See `AGENTS.md` and `docs/ai/` for feature implementation, security boundaries, tests and architecture. WorkItems is a tested example vertical slice; it is not production business logic. Replace starter brand/favicon/assets when generating a real app.

## Authorization and user administration

After first-user bootstrap, the built-in `Administrators` role can manage users at `/users`. New accounts receive the `Users` role and read-only sample access; other permissions are explicit and enforced by the API. The `Administrators` role cannot be changed by the general permission editor. Changes to claims invalidate security stamps; users may need to sign in again. See `docs/ai/PARITY_ROADMAP.md` for the Blazor/React compatibility contract and remaining gaps.

## React Design System

A public interactive component gallery is available at /components. Accessible Dialog/ConfirmDialog, Form/Field, Select, OTP, DataTable and Toast primitives are built into shared/ui, theme-aware and RTL-ready. See docs/ai/REUSABLE_COMPONENTS.md for API samples and current limitations.

## Account self-service

Signed-in users can manage their own profile and change their password at `/account`. The login screen links to `/forgot-password`; email verification and token-based reset use dedicated React pages. Configure a trusted `AccountEmail:PublicBaseUrl` and SMTP sender for real emails; absent configuration, password recovery never sends a link, and email changes are blocked. Details: `docs/ai/ACCOUNT_SELF_SERVICE.md`.

## Account access

React uses username/password, independently of email. For isolated local Development, the starter creates an admin/admin demo login; never expose these credentials on a public instance. Production bootstrap remains explicit and requires a strong password.
