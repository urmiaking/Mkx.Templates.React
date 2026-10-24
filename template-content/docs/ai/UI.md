# UI conventions
Strict TypeScript; feature-local api.ts, schema, components, tests. Use shared/api/http.ts (not fetch in page) and TanStack Query for server state. Shared UI components remain UI-library-neutral; CSS variables provide light/dark tokens; React Router owns navigation. Persian RTL is starter default. Accessible labels, focus-visible, keyboard input, errors and reduced motion are mandatory; test 320px layouts. OpenAPI contract declarations and typed feature clients are generated from ASP.NET Core metadata. Run `npm run api:generate` after API contract changes and `npm run api:check` to detect drift.

## Appearance and management

Theme mode and palette are independent persisted preferences (`Theme.Mode` and `Theme.Palette`). Available palettes match the Blazor semantic identifiers: jade, ocean, iris, amber. The semantic background/surface/text/accent/hover tokens also align with Blazor. `useTheme` owns mode, palette and mobile floating-picker visibility; `ThemeControls.tsx` provides the header mode toggle, draggable left-edge palette picker and sidebar quick swatches. `appearance.css` defines palette tokens and the picker visuals.

User-triggered theme switches use a native View Transition with an 800ms radial reveal from the clicked control: the new dark snapshot expands for dark mode, whereas the old dark snapshot contracts when returning to light mode. Palette changes expand the new snapshot. Reduced-motion preference or absent browser APIs immediately updates without animation. `Theme.PickerPosition` stores the vertical floating-tab position and `Theme.MobilePickerHidden` controls visibility on mobile. The 44px drag control supports pointer/touch and arrow/Home/End keys. Mobile users can always restore it from sidebar quick swatches.

`/login`, `/login/2fa`, `/forgot-password`, `/reset-password` and `/verify-email` render inside `IdentityLayout` with no workspace sidebar, topbar or breadcrumbs. Keep all public identity screens in that independent layout. React uses its own UI primitives, responsive CSS and role-gated `/users` surface. The frontend only hides unavailable actions; the server enforces authorization.

## Mkx UI primitives (Phase 1)

Before introducing new controls, read docs/ai/REUSABLE_COMPONENTS.md. The public shared/ui API now includes accessible Dialog, ConfirmDialog, Field/Form/TextInput/TextArea/CheckBox, Select, OtpField, typed DataTable, ToastProvider/useToast, Button/IconButton, Card and Breadcrumbs. A public interactive showcase is available at /components. Internal Radix Dialog/AlertDialog/Select primitives provide robust focus/keyboard behavior without exposing the library to feature consumers. Keep feature components colocated, use semantic tokens from shared/ui/ui.css, and cover interactions in Vitest. Large production tables require server-side pagination; sample DataTable is client-side.

## User administration

The /users screen uses a responsive two-pane layout and feature-local users.css. Keep create/edit dialogs and destructive confirmation on shared components, provide error and pending feedback, and preserve backend-driven search and page boundaries. See docs/ai/USER_ADMINISTRATION.md.

## Sticky header and Persian numerals

The AppBar sticks to the top of document scroll; use normal flow and an appropriate z-index below mobile navigation overlays and modal dialogs. Desktop/mobile heights remain 78/66px. Avoid overflow clipping on its ancestors.

Vazirmatn supports Persian numeral shapes via the OpenType ss01 feature, enabled globally. The reusable OtpField always renders actual Persian Unicode digits while keeping the controlled value/onChange as normalized ASCII for backend consumption. Tests cover pasting Arabic/Persian numerals, display, and ASCII output.

### Bundled Vazirmatn and reliable Farsi digits

The UI uses the complete variable Vazirmatn webfont bundled locally at `src/Client/public/fonts/Vazirmatn.woff2`, with its OFL license in the same directory. The previous Google Fonts CSS served subsetted files that did not render Latin digits using `ss01` consistently. Keep `font-feature-settings: "ss01"` at the root, and use the full bundled font to ensure dashboard numbers, pagination, counters and version strings render with Persian glyphs even when Google Fonts is unavailable.

This is a display-glyph substitution; it intentionally does not mutate API payloads, input identifiers or underlying ASCII numeric values. OTP separately renders Persian Unicode digits while maintaining normalized ASCII state. Do not reintroduce Google Fonts CSS for this face or omit the font from the NuGet template package.
