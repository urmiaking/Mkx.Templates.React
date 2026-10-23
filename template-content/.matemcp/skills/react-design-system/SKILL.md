# React Design System feature workflow

Use this Skill whenever creating, changing, or applying reusable React controls in a generated Mkx React workspace.

1. Read `AGENTS.md`, `docs/ai/UI.md`, and `docs/ai/REUSABLE_COMPONENTS.md` first.
2. Search `src/Client/src/shared/ui` before adding components. The starter includes Button/IconButton, Card/Breadcrumbs, Dialog/ConfirmDialog, Form/Field/TextInput/TextArea/CheckBox, Select, OtpField, DataTable and ToastProvider/useToast.
3. Add a shared component **only when reuse is demonstrated**. Keep domain-specific UIs under `features/<name>`.
4. Keep public props library-neutral and typed; Radix is an internal accessibility implementation detail, not an API clients should depend on.
5. Preserve RTL, semantic theme variables, light/dark, four color palettes, keyboard/Focus interaction, accessible labels, disabled/pending/error states, reduced-motion responsiveness and mobile overflow.
6. Use controlled state, not direct DOM manipulation. Confirm destructive actions asynchronously and close on success, displaying errors without losing user input.
7. Keep shared styles in `shared/ui/ui.css`, not duplicated per feature. Use CSS tokens rather than hard-coded primary colors.
8. Extend the public `/components` showcase when a new primitive is added. Keep showcase sample-only and publicly safe.
9. Add Vitest tests for accessibility and behavior, and run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`; before releasing the NuGet template, run root `./scripts/verify-template.ps1`.
10. Use `DataTable<T>` only for bounded local data. For large datasets, use server-driven filtering/paging and do not load every database row.

No secret, credentials, live personal data, or development screenshots should be committed.
