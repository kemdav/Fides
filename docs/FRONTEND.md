# Frontend reuse guide

Use what already exists before writing new markup. This keeps spacing, heights, colours and focus styles consistent.
Where UI code sits relative to services and queries is described in [ARCHITECTURE](ARCHITECTURE.md) (section 8).
Colour tokens live in `src/app/globals.css` (`burnt`, `burnt-dark`, `powder`, `ink`, `muted`, `subtle`, `line`, `hairline`,
`mist`, `glyph`, `outline`, `danger`, `info-bg`, ...). Use tokens, not hex values.

## Buttons: `buttonClasses` (`src/components/ui/button.tsx`)

```tsx
<Link href="/register" className={buttonClasses({ variant: "brand", size: "cta" })}>Get Started</Link>
<button className={buttonClasses({ variant: "secondary", size: "form" })}>Cancel</button>
```

| Variant | Use |
| --- | --- |
| `brand` / `brand-outline` | Primary and secondary actions on public and merchant pages |
| `secondary` | Neutral outlined button inside forms and dialogs |
| `danger` | Destructive actions |
| `accent`, `solid`, `outline`, `ghost` | Specific cases, see the file |

| Size | Height | Use |
| --- | --- | --- |
| `cta`, `pill` | 48px | Landing and marketing buttons |
| `form`, `formLg` | 48px | Buttons next to form fields and in dialogs |
| `lg` / `md` / `sm` / `xs` | 48 / 40 / 32 / 36px | Dense UIs |

Buttons never move on hover (colour change only) and always show a hand cursor and a focus ring. Admin screens use
`AdminButton` / `AdminLinkButton`, which wrap the same classes.

## Form fields

- `inputClasses(invalid?)` (`src/components/ui/input.tsx`) is the one text-field style (48px, rounded, semibold text).
  Use it on any `<input>`, `<textarea>` or select-like control instead of writing border and focus classes.
- `PasswordInput` (`src/components/ui`) has the show/hide toggle.
- `src/components/auth/auth-ui.tsx` has the labelled field set: `AuthField`, `AuthPasswordField`, `AuthSubmit`, `AuthBanner`,
  `AuthCard`, `AuthFootnote`. Use them for any sign-in, reset or contact style form.
- `AdminAuthShell` (`src/components/auth/admin-auth-shell.tsx`) is the two-panel layout for admin auth screens.

## Navigation

- Public headers (`landing/header.tsx`, `landing/provider-header.tsx`, `storefront/storefront-header.tsx`) share the same rules:
  fixed 64px (mobile) / 88px (desktop) height, no line under links except the current one, `gap-1` between links.
- On phones the menu is the shared full-page `MobileMenu` (`src/components/landing/mobile-menu.tsx`). Pass it links and actions,
  do not build another dropdown.
- Landing links live in `src/components/landing/links.ts`. "Get Started" and "Create an Account" go to `/register`,
  contact goes to `/contact`. There is no Login button on the landing page by design.

## Cards and modals

- `MetricCard` (`src/components/admin/metric-card.tsx`) is used by admin and merchant pages. Labels and captions wrap on small screens.
- `Modal` (`src/components/ui/modal.tsx`) is the dialog. `AdminModal` wraps it.

## Icons and text

- Admin and landing use the Solar icon set through `src/components/admin/icon.tsx`. Merchant screens keep their own icon files.
- Do not use text smaller than `text-xs` (12px) in new UI.

## Responsiveness checklist

- Check every new screen at 390px wide: no horizontal scroll, no cut-off labels, tap targets at least 40px.
- Use `min-w-0` on flex and grid children that hold long text, and let labels wrap instead of `truncate` when they carry meaning.

## Routes to know

| Route | Who |
| --- | --- |
| `/` , `/contact`, `/register` | Public |
| `/login` | Business owners |
| `/admin/login` | Fides admins (separate design) |
| `/admin/...` | Admin portal (needs a platform admin) |
| `/[slug]/dashboard/...` | Merchant dashboard |
| `/[slug]/...` | Tenant storefront |
