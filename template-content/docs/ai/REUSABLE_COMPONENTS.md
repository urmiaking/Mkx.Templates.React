# Mkx React Design System — Phase 1

The generated workspace includes a UI-library-neutral **public component API** in `src/Client/src/shared/ui`. Implementation uses focused Radix UI accessibility primitives internally for Dialog, AlertDialog and Select; consumers are not required to use Radix APIs, Tailwind or shadcn.

## Components and imports

| Component | Purpose |
| --- | --- |
| `Button`, `IconButton` | Typed buttons with variants including primary, secondary, ghost and destructive |
| `Card`, `Breadcrumbs` | Reusable content surfaces and semantic route navigation |
| `Dialog` | Controlled accessible modal with portal, overlay, focus management, scrollable body, title and optional footer |
| `ConfirmDialog` | Destructive/ordinary confirmation with async pending and error handling; no browser `window.confirm` |
| `Form`, `Field`, `TextInput`, `TextArea`, `CheckBox` | Native controlled input building blocks; errors connected via `aria-describedby` |
| `Select` | Accessible, keyboard-enabled select without a hardcoded UI kit |
| `OtpField` | Controlled OTP with Persian/Arabic digit normalization, full-code paste, focus and Backspace |
| `DataTable<T>` | Typed local client-side sorting, optional cell formatters, pagination, responsive horizontal scroll and empty/loading states |
| `ToastProvider`, `useToast` | Four-message stack, success/error/info tones, dismiss and auto-removal |

All components consume `shared/ui/ui.css` and existing semantic CSS tokens from `src/styles.css`. The application imports the stylesheet once in `main.tsx` and wraps routes in `ToastProvider`. Components support the existing `jade`, `ocean`, `iris` and `amber` palettes plus light/dark modes, RTL and reduced motion.

## Live component reference

Run the application and visit **`/components`** (no login needed). The route contains a sample form Dialog, async ConfirmDialog, Toasts, Select, Field validation, OTP and DataTable. It is intentionally a **UI playground with demo data only**, and must not expose live administrative data.

Examples:

```tsx
const [open, setOpen] = useState(false)
<Dialog open={open} onOpenChange={setOpen} title="ویرایش" description="اطلاعات را وارد کنید">
  <Field label="عنوان" required error={error}>
    {field => <TextInput id={field.id} required aria-invalid={field.invalid}
      aria-describedby={field.describedBy} value={title}
      onChange={event => setTitle(event.target.value)} />}
  </Field>
</Dialog>
```

```tsx
const toast = useToast()
toast.show('تغییرات ذخیره شد.', 'success')
```

```tsx
<DataTable rows={rows} columns={columns} getRowId={row => row.id}
  pageSize={20} caption="فهرست کاربران" />
```

## Agent rules and limitations

- Prefer these primitives before adding a new UI kit or duplicating feature controls. Feature-specific components remain inside `features/<name>`.
- Use native semantic HTML, accessible names, keyboard/Focus behaviour and meaningful progress/empty/error states.
- Keep dialogs controlled; for mutations, await async actions, handle errors and close only on success.
- `DataTable` is deliberately **client-side** sorting and pagination; for thousands of records use backend paging and an appropriately server-driven table. Never fetch entire production datasets just to use its pager.
- `OtpField` is presentation only: validate codes, expiry and attempts on the server. Never treat a completed six-digit UI value as authentication.
- Show Toasts as supplemental feedback; retain validation text at the relevant field and use server-side authorization.
- Add Vitest interaction coverage for shared primitive behaviour and verify responsive layouts on real browsers.
- No enterprise DataGrid, form-schema framework, virtual scrolling, WYSIWYG editor or visual-test automation is claimed as implemented in this phase.

Use `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` in `src/Client`, then root `./scripts/verify-template.ps1` to verify the produced NuGet solution template.
