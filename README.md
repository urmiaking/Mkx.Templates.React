# Mkx.Templates.React

Agent-friendly **.NET 10 + React 19 + TypeScript** solution template distributed as a NuGet `dotnet new` template. The architecture includes ASP.NET Core hosted React, Domain/Application/Infrastructure layers, Identity, feature-based permissions, EF Core, TanStack Query and responsive RTL appearance.

![Mkx Templates icon](icon.png)

## Get started

Requirements: .NET 10 SDK and Node.js 24+.

```powershell
dotnet new install Mkx.Templates.React
dotnet new mkx-react -n Acme.Workspace -o Acme.Workspace
```

The generated application's development, authentication and deployment instructions are in its own README and `AGENTS.md`. Developers can run complete local checks with:

```powershell
./scripts/verify-template.ps1
```

To install an editable template locally, run `dotnet new install ./template-content`. The checked-in migrations target SQLite; SQL Server requires provider-specific migrations.

## Relationship to Blazor

The React and [Blazor templates](https://github.com/urmiaking/Mkx.Templates) are independent packages, but share Identity role names, policy/claim conventions and baseline architecture goals. The React package uses **the exact same icon** as the Blazor package. See [the parity roadmap](template-content/docs/ai/PARITY_ROADMAP.md).

## Automatic NuGet publishing

**Every successful push to `main` automatically publishes a new version to NuGet.org.**

The CI workflow first builds/tests .NET and React, packs the template and verifies template installation/generation. Successful CI for the pushed commit triggers a lightweight NuGet publication workflow, pinned to the *same commit*. No manual version edit, tag, or release button is necessary.

The package version follows the Blazor template's build-number strategy: **`0.3.<publish-workflow-run-number>`**, so successive publication runs use distinct, increasing version numbers without version-bump commits. Source metadata retains version `0.2.0` for local development; CI overrides the published `PackageVersion`.

Full template install/generated-project build/tests/publish still run for pull requests and manually started full verification. They are intentionally not repeated in each publication.

NuGet Trusted Publishing: package owner `mskhodadadi`, GitHub repository `urmiaking/Mkx.Templates.React`, workflow file `publish.yml`, environment `production`. **No permanent NuGet API key secret** is required: GitHub OIDC supplies a temporary key.

The NuGet package contains `icon.png` and a dedicated landing-page README `NUGET_README.md`, as well as the solution template itself.

- [NuGet package](https://www.nuget.org/packages/Mkx.Templates.React)
- [Verification runs](https://github.com/urmiaking/Mkx.Templates.React/actions/workflows/verify.yml)
- [Publishing runs](https://github.com/urmiaking/Mkx.Templates.React/actions/workflows/publish.yml)

If validation fails, the package is **not** published. A manual release may be triggered for recovery with a fresh unused version.

## React UI foundations

The generated app includes reusable, accessible UI foundations and a /components showcase (Dialog, Form/Field, Select, OTP, Table and Toast). These are themeable and library-neutral at the component API level. See template-content/docs/ai/REUSABLE_COMPONENTS.md for usage and limitations.

## User administration milestone

The React /users workspace supports account creation, guarded email editing, lock/unlock, deletion, Users membership and direct/role policy updates with server-side authorization. See template-content/docs/ai/USER_ADMINISTRATION.md for routes, protections and limits.

## React username login

The generated app uses username/password like Blazor, with separate email for account contact details. Isolated local Development provides the requested admin/admin demo credentials; Production does not seed fixed demo accounts.
