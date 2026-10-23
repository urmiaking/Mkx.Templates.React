# Mkx React package lifecycle

This project is a dotnet new NuGet template with authoritative generated solution under `template-content`. Read root `AGENTS.md` then generated `AGENTS.md`. Packaging changes require `./scripts/verify-template.ps1`: source build/tests, NuGet pack, inspect exclusions, isolated hive installation, generation with name replacement and build/test/publish of the generated output. Avoid modifying the sibling Blazor repository. Never commit output/caches or publish without user-specified destination.

## NuGet release process

Use .github/workflows/publish.yml with GitHub OIDC and NuGet/login@v1; publish is gated by GitHub production environment. The policy on nuget.org must match repository owner urmiaking, repository Mkx.Templates.React, workflow basename publish.yml, environment production, and the NuGet account username mskhodadadi. Do not create NUGET_API_KEY secrets for this workflow. Tag releases vX.Y.Z or manually dispatch from main with a unique package version only after the trusted publishing policy is saved. Always require full template install, generated-solution tests, package validation, and publish verification before claiming release.
