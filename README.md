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
dotnet new install ./bin/Release/Mkx.Templates.React.0.1.0.nupkg
dotnet new mkx-react -n Acme.Workspace -o Acme.Workspace
```

Or install the editable template: `dotnet new install ./template-content`.

The full generated-application guide is in `template-content/README.md`. No credentials are shipped. SQL Server needs separate provider-specific EF migrations; checked-in migrations target SQLite.
