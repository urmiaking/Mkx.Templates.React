# Mkx.Templates.React

A distributable **.NET 10 + React 19 + TypeScript** solution template, delivered as a NuGet **template package** (not a runtime library). It is an independent baseline, not a feature-by-feature clone of the Blazor template.

- Template ID: `Mkx.Templates.React`, short name `mkx-react`.
- Same-origin React SPA + ASP.NET Core host; one production deployment.
- Domain, Contracts, Application, Infrastructure, Server, Tests, React/Vite Client.
- SQLite migrations, Identity cookies + CSRF, policy-based administration and sample CRUD.
- Feature-first React, Zod, TanStack Query, Router, CSS tokens, light/dark theme, and RTL support.

## Local installation

Requires .NET 10 SDK and Node.js 24+.

```powershell
./scripts/verify-template.ps1
dotnet pack Mkx.Templates.React.csproj -c Release
dotnet new install ./bin/Release/Mkx.Templates.React.0.2.0.nupkg
dotnet new mkx-react -n Acme.Workspace -o Acme.Workspace
```

You may also install the editable source template with `dotnet new install ./template-content`.
See `template-content/README.md` for development and deployment instructions. The checked-in migrations target SQLite; SQL Server needs separate provider-specific migrations.

## Blazor / React capabilities

The React template shares the Blazor built-in roles, capability policy names and claim semantics. It includes user administration and four appearance palettes. See `template-content/docs/ai/PARITY_ROADMAP.md` for completed parity and remaining gaps.

## NuGet.org release: fast publishing, full CI checks

**Full verification runs once per source commit** in [Verify React Template](.github/workflows/verify.yml) on pushes to `main` and pull requests: install the template, generate a renamed application, build, test and publish it.

[Publish NuGet Template](.github/workflows/publish.yml) does **not repeat** that expensive verification. It verifies that the exact commit already passed the push CI workflow, checks main-branch ancestry, performs a lightweight NuGet pack/content check and publishes with Trusted Publishing (GitHub OIDC). Tags do not trigger the heavy CI again.

Before release, configure [NuGet Trusted Publishing](https://www.nuget.org/account/TrustedPublishing) with Package Owner `mskhodadadi`, GitHub Repository Owner `urmiaking`, Repository `Mkx.Templates.React`, Workflow File `publish.yml` (**basename only**) and Environment `production`. The only necessary scope is *Push new packages and package versions*.

After **Verify React Template** succeeds for the desired commit on `main`, open GitHub Actions → **Publish NuGet Template** → **Run workflow** on `main` and enter a **new unused NuGet version** (for example `0.3.0`). Alternatively, tag a previously verified main commit as `v0.3.0` and push the tag.

Publication uses the existing GitHub `production` environment and ephemeral OIDC credentials. **Do not add a permanent `NUGET_API_KEY` GitHub secret.** Publishing before the commit's CI is green fails quickly by design. Never attempt to re-publish an existing NuGet version.
