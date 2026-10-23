# Mkx.Templates.React

**Production-minded ASP.NET Core 10 + React 19 starter, packaged for `dotnet new`.**

Build ASP.NET Core-hosted React applications with a clean and scalable project structure, typed frontend features, built-in security foundations, and guidance written specifically for AI coding agents.

## ✨ What's included

| Area | Technology |
|---|---|
| Backend | ASP.NET Core 10, Domain / Application / Infrastructure, EF Core |
| Frontend | React 19, TypeScript, Vite, React Router |
| Data fetching | TanStack Query and a typed, shared HTTP client |
| Validation | Domain invariants + Zod client-side UX validation |
| Identity | ASP.NET Core Identity, HttpOnly cookies and antiforgery |
| Permissions | Policy-based authorization, user and role permission administration |
| Appearance | Responsive RTL starter, light/dark mode and four color palettes |
| Reusable UI | Accessible Dialog, ConfirmDialog, Forms, Select, OTP, Table, Toast and interactive /components gallery |
| Testing | xUnit, Vitest, ESLint, TypeScript checks |
| Delivery | One ASP.NET Core host, Docker, CI and template validation |
| AI agents | `AGENTS.md`, architecture guides and repeatable feature workflows |

**No UI library lock-in.** Start with accessible React primitives and CSS tokens, then integrate your preferred UI library when your product actually needs one.

## 🚀 Get started

Install the template:

```bash
dotnet new install Mkx.Templates.React
```

Create your project:

```bash
dotnet new mkx-react -n MyCompany.MyApp -o MyCompany.MyApp
```

Run the .NET API:

```bash
cd MyCompany.MyApp
dotnet run --project src/Server/MyCompany.MyApp.Server
```

In a second terminal, start React with Vite HMR:

```bash
cd MyCompany.MyApp/src/Client
npm ci
npm run dev
```

In production, `dotnet publish` builds React and serves its generated assets through **one ASP.NET Core host**.

## 🤖 Agent-first architecture

Generated apps contain `AGENTS.md`, `docs/ai`, a tested CRUD reference feature and explicit architecture/security conventions. The result is designed to help coding agents implement **complete features across UI, HTTP, use cases, persistence and tests**, instead of generating unrelated files.

## 🔐 Security and deployment notes

The template ships **without default accounts or passwords**. Administrator bootstrap must be explicitly configured through private secrets, then disabled. The checked-in EF Core migrations target SQLite; generate and validate provider-specific migrations before switching to SQL Server. Configure HTTPS, trusted reverse proxies and persistent Data Protection keys for production use.

## Links

- [GitHub repository](https://github.com/urmiaking/Mkx.Templates.React)
- [Complete documentation](https://github.com/urmiaking/Mkx.Templates.React#readme)
- [Blazor edition](https://www.nuget.org/packages/Mkx.Templates.Blazor)

Maintained as a NuGet **project template**, not a runtime React component package.
