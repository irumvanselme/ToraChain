/**
 * Regenerates `app/pages/_logos.ts` from the repo-root brand assets.
 *
 * The server-rendered auth pages have no bundler or static host (unlike the
 * SPAs, which load these SVGs from `public/_assets` via
 * `@tora-chain/ui-components`), so the ToraChain brand marks are embedded as
 * string constants and rendered inline. Run `bun run gen:logos` after changing
 * `assets/logo-square.svg` or `assets/logo-text.svg`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// scripts/ -> apps/auth -> apps -> repo root
const repoRoot = join(import.meta.dir, "..", "..", "..");
const assets = join(repoRoot, "assets");

const mark = readFileSync(join(assets, "logo-square.svg"), "utf8").trim();
const word = readFileSync(join(assets, "logo-text.svg"), "utf8").trim();

// The square mark as a data URI, mirroring admin-fe's favicon.
const faviconDataUri = "data:image/svg+xml," + encodeURIComponent(mark);

// Emit a JS string literal the way Prettier would: pick the quote that needs
// fewer escapes (double wins ties, matching Prettier's default), so the
// generated file stays format-clean without a follow-up `prettier --write`.
const jsString = (s: string) => {
  const doubles = (s.match(/"/g) ?? []).length;
  const singles = (s.match(/'/g) ?? []).length;
  const q = doubles > singles ? "'" : '"';
  const body = s
    .replace(/\\/g, "\\\\")
    .replace(new RegExp(q, "g"), "\\" + q)
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
  return q + body + q;
};

const out = `// AUTO-GENERATED — do not edit by hand. Run \`bun run gen:logos\` to update.
// Source: repo-root \`assets/logo-square.svg\` and \`assets/logo-text.svg\`.
//
// The server-rendered auth pages have no bundler or static host (unlike the
// SPAs, which load these from \`public/_assets\` via \`@tora-chain/ui-components\`),
// so the ToraChain brand marks are embedded here and rendered inline.

/** Square "T" brand mark. Sized via CSS (\`.logo-mark svg\`). */
export const LOGO_MARK_SVG =
  ${jsString(mark)};

/** "ToraChain" wordmark. Sized via CSS (\`.logo-wordmark svg\`). */
export const LOGO_WORDMARK_SVG =
  ${jsString(word)};

/** The square mark as a data URI, for use as a \`<link rel="icon">\` favicon. */
export const LOGO_FAVICON_DATA_URI =
  ${jsString(faviconDataUri)};
`;

const target = join(import.meta.dir, "..", "app", "pages", "_logos.ts");
writeFileSync(target, out);
console.log(`wrote ${target}`);
