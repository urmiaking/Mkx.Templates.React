# UI conventions
Strict TypeScript; feature-local api.ts, schema, components, tests. Use shared/api/http.ts (not fetch in page) and TanStack Query for server state. Shared UI components remain UI-library-neutral; CSS variables provide light/dark tokens; React Router owns navigation. Persian RTL is starter default. Accessible labels, focus-visible, keyboard input, errors and reduced motion are mandatory; test 320px layouts. OpenAPI contract code generation is not implemented; coordinate manual request/response changes across server and client.

## Appearance and management

Theme mode and palette are independent persisted preferences (`Theme.Mode` and `Theme.Palette`). Available palettes match the Blazor semantic identifiers: jade, ocean, iris, amber. React uses its own UI primitives, responsive CSS and role-gated `/users` surface. The frontend only hides unavailable actions; the server enforces authorization.

## Mkx UI primitives (Phase 1)

Before introducing new controls, read docs/ai/REUSABLE_COMPONENTS.md. The public shared/ui API now includes accessible Dialog, ConfirmDialog, Field/Form/TextInput/TextArea/CheckBox, Select, OtpField, typed DataTable, ToastProvider/useToast, Button/IconButton, Card and Breadcrumbs. A public interactive showcase is available at /components. Internal Radix Dialog/AlertDialog/Select primitives provide robust focus/keyboard behavior without exposing the library to feature consumers. Keep feature components colocated, use semantic tokens from shared/ui/ui.css, and cover interactions in Vitest. Large production tables require server-side pagination; sample DataTable is client-side.
