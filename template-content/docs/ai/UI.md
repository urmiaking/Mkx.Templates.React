# UI conventions
Strict TypeScript; feature-local api.ts, schema, components, tests. Use shared/api/http.ts (not fetch in page) and TanStack Query for server state. Shared UI components remain UI-library-neutral; CSS variables provide light/dark tokens; React Router owns navigation. Persian RTL is starter default. Accessible labels, focus-visible, keyboard input, errors and reduced motion are mandatory; test 320px layouts. OpenAPI contract code generation is not implemented; coordinate manual request/response changes across server and client.

## Appearance and management

Theme mode and palette are independent persisted preferences (`Theme.Mode` and `Theme.Palette`). Available palettes match the Blazor semantic identifiers: jade, ocean, iris, amber. React uses its own UI primitives, responsive CSS and role-gated `/users` surface. The frontend only hides unavailable actions; the server enforces authorization.

## Mkx UI primitives (Phase 1)

Before introducing new controls, read docs/ai/REUSABLE_COMPONENTS.md. The public shared/ui API now includes accessible Dialog, ConfirmDialog, Field/Form/TextInput/TextArea/CheckBox, Select, OtpField, typed DataTable, ToastProvider/useToast, Button/IconButton, Card and Breadcrumbs. A public interactive showcase is available at /components. Internal Radix Dialog/AlertDialog/Select primitives provide robust focus/keyboard behavior without exposing the library to feature consumers. Keep feature components colocated, use semantic tokens from shared/ui/ui.css, and cover interactions in Vitest. Large production tables require server-side pagination; sample DataTable is client-side.

## User administration

The /users screen uses a responsive two-pane layout and feature-local users.css. Keep create/edit dialogs and destructive confirmation on shared components, provide error and pending feedback, and preserve backend-driven search and page boundaries. See docs/ai/USER_ADMINISTRATION.md.

## Sticky header and Persian numerals

The AppBar sticks to the top of document scroll; use normal flow and an appropriate z-index below mobile navigation overlays and modal dialogs. Desktop/mobile heights remain 78/66px. Avoid overflow clipping on its ancestors.

Vazirmatn supports Persian numeral shapes via the OpenType ss01 feature, enabled globally. The reusable OtpField always renders actual Persian Unicode digits while keeping the controlled value/onChange as normalized ASCII for backend consumption. Tests cover pasting Arabic/Persian numerals, display, and ASCII output.
