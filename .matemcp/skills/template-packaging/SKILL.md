# Mkx React package lifecycle

This repository is a `dotnet new` NuGet template; the generated application source lives under `template-content`. Read the root `AGENTS.md`, generated `AGENTS.md`, and relevant architecture notes before changing application code.

## Quality gate

For changes to application/template content, run `./scripts/verify-template.ps1` locally when feasible. The `.github/workflows/verify.yml` workflow performs expensive install/generation/build/server-client tests/publish checks for pushes to main and pull requests. Keep these full checks, but **never repeat them in the publication workflow**.

## Fast NuGet publishing

NuGet Trusted Publishing must match GitHub repository `urmiaking/Mkx.Templates.React`, NuGet account `mskhodadadi`, workflow basename `publish.yml`, and environment `production`. The publish workflow:
1. Confirms a main-branch commit with successful `verify.yml` push CI for its **exact SHA**.
2. Performs lightweight NuGet pack/content inspection.
3. Uses GitHub OIDC via `NuGet/login@v1` and publishes to NuGet.org.

There is **no permanent NUGET_API_KEY secret**. After full main CI passes, use workflow_dispatch on main with a fresh version or push a semver tag pointing to a verified commit. Tag pushes do not trigger full CI. Never republish a version or commit secrets.
