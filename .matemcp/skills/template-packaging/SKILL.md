# Mkx React template packaging and automatic releases

The repository packages the generated solution in `template-content` as a NuGet `dotnet new` template. Read root `AGENTS.md` and generated `AGENTS.md` before application changes.

## Package assets

The package includes `icon.png`, **identical to the Blazor template icon**, and `NUGET_README.md`, a dedicated NuGet page. `Mkx.Templates.React.csproj` declares `PackageIcon` and `PackageReadmeFile`. The root `README.md` targets developers, not the package landing page. `scripts/verify-template.ps1` checks both assets in the actual NuGet ZIP.

## Every main push automatically releases

The React default branch is **`main`** (Blazor uses `master`). Every push runs `.github/workflows/verify.yml` fast .NET/React validation, package integrity and installed-template generation smoke. Success automatically triggers `.github/workflows/publish.yml` through GitHub `workflow_run`. Publication is pinned to the **same verified commit**; failed checks cannot publish.

The published NuGet version is `0.3.<publish workflow run_number>`, increasing automatically without source version-bump commits. **Do not implement a commit-based version bump loop.** Keep full generated-solution verification in pull requests and manual CI, but do not repeat that slow path on every release. For template packaging modifications, run local `./scripts/verify-template.ps1` when feasible.

The publication uses NuGet Trusted Publishing via OIDC; NuGet account `mskhodadadi`, GitHub `urmiaking/Mkx.Templates.React`, workflow basename `publish.yml`, Environment `production`. **No persistent `NUGET_API_KEY` secret** is required. Maintain secure permissions and explicit successful-CI gates.

Never commit build outputs, temporary files, dependency caches or credentials.
