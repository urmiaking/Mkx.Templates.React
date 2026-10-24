# Server-to-React API contracts

The ASP.NET Core 10 Server owns the HTTP contract. The committed TypeScript declarations in `src/Client/src/shared/api/schema.generated.ts` are derived from build-time OpenAPI metadata. Do not edit generated types or maintain a parallel hand-written DTO for migrated features.

## Update the contract

1. Define C# request/response DTOs and attach accurate minimal-API response metadata (for example, `.Produces<WorkItemsPage>()`), including actual HTTP status codes.
2. In the generated solution, run from `src/Client`:

   ```powershell
   npm ci
   npm run api:generate
   npm run typecheck
   npm run api:check
   ```

3. Commit endpoint/contract changes and the regenerated `schema.generated.ts` together. `api:check` rebuilds Server OpenAPI and fails if the checked-in type file differs. Local `scripts/verify.ps1` and CI enforce this.

The generator discovers the Server project by its `*.Server.csproj` filename; it also works after `dotnet new` renames the solution. The server package `Microsoft.Extensions.ApiDescription.Server` produces a JSON document at build time using `-p:OpenApiGenerateDocumentsOnBuild=true`, without starting the web host or connecting to the database. Normal builds/publishes disable OpenAPI document generation. The JSON under `obj` is intermediate and must not be committed.

## Calling the API

For new React features, use `contractClient` in `src/Client/src/shared/api/http.ts`: `GET('/api/work-items', ...)`, `POST(...)`, etc. OpenAPI-generated `paths` validates route names, path/query parameters, request JSON and declared response types at compile time. Use `apiData` to preserve the app's `ApiError` behavior. Both `contractClient` and the existing `request<T>` use one cookie-authenticated `fetchWithCsrf` transport, which fetches an antiforgery token for unsafe methods.

WorkItems, user administration and account self-service are migrated reference vertical slices. The generated `WorkItemDto`, `UserSummary`, `UsersPage`, `RoleSummary` and `AccountProfile` schemas are the React types; no parallel hand-written equivalents are maintained. All CRUD, claims/roles, profile, password change, verification and recovery operations in those features use typed routes and request bodies. The existing `request<T>` remains for features not yet migrated (authentication, MFA, passkeys and external OIDC). Their return types are **not** automatically verified until Server endpoints publish typed response metadata (plain `Results.Ok(object)` otherwise produces an untyped 200 response in the OpenAPI document).

OpenAPI `int64` is represented as `string | number` by the type generator to avoid assuming all 64-bit values are JavaScript-safe numbers. Normalize values only when the application's range is known (WorkItems and Users pagination totals are bounded).
