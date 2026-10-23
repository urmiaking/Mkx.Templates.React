# Mkx React Template Packaging Repository

`template-content/` is the authoritative generated application. Read `template-content/AGENTS.md` and relevant `template-content/docs/ai` documents before application changes. Package and verification logic belongs at repository root.

Required delivery lifecycle: inspect existing patterns; implement and test changes; update canonical docs; run `./scripts/verify-template.ps1` including isolated NuGet installation and generated-solution build; report any skipped check. Never commit `bin`, `obj`, `dist`, `node_modules`, generated SQLite files or credentials. Do not push code or publish packages without a configured explicit destination.
