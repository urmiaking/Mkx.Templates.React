# Mkx React package lifecycle

This project is a dotnet new NuGet template with authoritative generated solution under `template-content`. Read root `AGENTS.md` then generated `AGENTS.md`. Packaging changes require `./scripts/verify-template.ps1`: source build/tests, NuGet pack, inspect exclusions, isolated hive installation, generation with name replacement and build/test/publish of the generated output. Avoid modifying the sibling Blazor repository. Never commit output/caches or publish without user-specified destination.
