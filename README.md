# Mkx.Templates.React

A distributable **.NET 10 + React 19 + TypeScript** solution template. Distributed as a **NuGet template package**, not a runtime library. This is a new independent architecture, not an unverified 1:1 port of the existing Blazor SDK.

- Template ID: `Mkx.Templates.React`, short name `mkx-react`.
- Same-origin React SPA + ASP.NET Core host; one deployable application.
- Domain, Contracts, Application, Infrastructure, Server, Tests, React/Vite Client.
- SQLite initial migration, ASP.NET Core Identity cookies + CSRF, sample CRUD with concurrency, test suites.
- Frontend feature-first, Zod, React Query, Router, CSS tokens; no UI-kit lock-in.

## Build and install

Requires .NET 10 SDK and Node.js 24+.

```powershell
./scripts/verify-template.ps1
dotnet pack Mkx.Templates.React.csproj -c Release
dotnet new install ./bin/Release/Mkx.Templates.React.0.2.0.nupkg
dotnet new mkx-react -n Acme.Workspace -o Acme.Workspace
```

Or install the editable template: `dotnet new install ./template-content`.

The full generated-application guide is in `template-content/README.md`. No credentials are shipped. SQL Server needs separate provider-specific EF migrations; checked-in migrations target SQLite.

## Shared Blazor / React baseline

The current React template aligns Identity built-in roles, capability claim types and sample/user policy names with `Mkx.Templates.Blazor`, and includes a policy-controlled user administration UI and four appearance palettes. The migration matrix and next milestones live in `template-content/docs/ai/PARITY_ROADMAP.md`.


## Publishing the NuGet template

The GitHub repository contains `.github/workflows/publish.yml`. Its `verify-and-pack` job validates
source + a freshly generated, renamed solution and packages a release version; its
`publish` job uses **NuGet Trusted Publishing (GitHub OIDC)** within the GitHub
`production` environment. There is no long-lived NuGet API key to manage.

Before first publish, create a policy at https://www.nuget.org/account/TrustedPublishing
with Package Owner `mskhodadadi`, Repository Owner `urmiaking`, Repository
`Mkx.Templates.React`, **Workflow File `publish.yml`** (basename only), and
Environment `production`. Allow *Push new packages and package versions*;
do not grant Unlist/Relist unless you actually need it.

After saving the NuGet policy, go to **Actions → Publish NuGet Template → Run workflow**
on **main**, supply a new unused version (e.g. `0.2.0`), and monitor both jobs.
Alternatively, after the policy exists, pushing a version tag `vX.Y.Z` starts the workflow.
Never republish an existing NuGet version; increment it.

GitHub Settings → Environments → `production` can optionally restrict who may approve
publishing. OIDC provides the token automatically; **do not create `NUGET_API_KEY`
in GitHub Secrets** for this workflow. See [NuGet Trusted Publishing](https://learn.microsoft.com/en-us/nuget/nuget-org/trusted-publishing).
