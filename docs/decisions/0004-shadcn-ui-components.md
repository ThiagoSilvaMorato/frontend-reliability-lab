# 0004 — shadcn/ui for UI primitives

## Problem

The UI needs accessible primitives (button, badge, card, input, later select/dialog) with keyboard support, focus handling and
ARIA done right. Writing those from scratch is slow and easy to get subtly wrong; a packaged component library would impose its
own styling and hide the code.

## Solution

Use shadcn/ui (Radix base, Tailwind v4). Components are copied into `src/components/ui/` with
`npx shadcn@latest add <name>`, so the code is ours. Only components a screen actually needs are added.

Adaptations made to fit this project:

- **Tokens:** `src/styles/tokens.css` defines the design-brief palette under shadcn's semantic names (`background`, `card`, `primary`,
  `muted-foreground`, `destructive`, `ring`, ...). Derived tokens where the brief's colors fail WCAG (`muted-foreground`, `input`,
  `ring`, `status-foreground`); the mapping and contrast ratios are documented in the file.
- **No dark mode:** the palette is light-only, so `@custom-variant dark` is bound to a `.dark` class that is never set. Otherwise
  shadcn's `dark:` classes would follow the OS setting and mix with the light palette.
- **Status text:** `text-white` on destructive fills was replaced with `text-destructive-foreground` (white on `#C98282` is 3.0:1).
- **`cn`:** the generated code imports `cn` from the `cn` npm package (maintained by shadcn, `shadcn-ui/cn`, zero dependencies),
  a drop-in for `clsx` + `tailwind-merge`. We follow the CLI's default instead of maintaining our own helper.

Dependencies added: `radix-ui`, `class-variance-authority`, `cn` (plus `lucide-react` when an icon is first needed).

## Why this approach

Accessibility is a stated priority and behavior like focus management is where hand-rolled components go wrong. Owning the source
means tokens, sizes and variants can be changed without fighting a library, and there is no runtime dependency on a design system.

## Alternatives

- Hand-written primitives: full control, but re-implements accessible behavior for little engineering value.
- Radix primitives directly: same accessibility, but styling every component ourselves.
- A packaged library (MUI, Mantine, Chakra): faster, but its styling model and bundle would dominate a small app.

## Trade-offs

- Generated code is ours to maintain; upgrading a component means re-running `add --overwrite` and re-applying the local edits above.
- `radix-ui` is a single meta package; unused primitives are tree-shaken from the bundle but still installed.
- `cn` is a young package (0.4.0). Swapping to `clsx` + `tailwind-merge` is a one-file change if it ever matters.

## How it is tested

Components are exercised through the behavior that uses them (ErrorState, language switcher, navigation) in RTL tests, not in
isolation. Contrast ratios were computed when choosing the derived tokens.
