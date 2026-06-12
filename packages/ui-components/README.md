# `@tora-chain/ui-components`

Shared React component library for the frontends, styled with **Tailwind CSS**
and **DaisyUI** and consumed via `workspace:*`. Dependency-free (ships
TypeScript source; the consuming app bundles it).

Components: `Button`, `Input`, `Textarea`, `Select`, `Card`, `Badge`, `Alert`,
`Spinner`, `Modal`, `Table`, `Pagination`, `PageHeader`, `EmptyState`, plus a
`cn()` class-name helper.

```tsx
import { Button, Card, Table } from "@tora-chain/ui-components";
```

The consuming app provides the Tailwind + DaisyUI build. Because this package
lives outside the app's source root, point Tailwind at it so its utility
classes are emitted:

```css
@source "../../packages/ui-components/src/**/*.tsx";
```
