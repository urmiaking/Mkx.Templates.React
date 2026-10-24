# Definition of done
Run ./scripts/verify.ps1 from generated solution. It restores, builds and tests .NET, checks that committed OpenAPI-generated TypeScript declarations match the Server endpoints, then verifies npm lint/typecheck/test/build, and publishes integrated SPA. For packager run ./scripts/verify-template.ps1, which installs package in isolated hive, instantiates renamed Acme.Workspace and repeats verification. Browser and Docker smoke tests require actual execution; never claim checks that were not run. Do not commit output/secrets.

For contract changes run `cd src/Client; npm run api:generate` before verification. Do not commit the intermediate Server OpenAPI JSON in `obj`. See `OPENAPI_CONTRACTS.md`.
