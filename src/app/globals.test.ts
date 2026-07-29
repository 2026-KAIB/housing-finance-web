import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import { describe, expect, it } from "vitest";

// Task 2's seven brand tokens live in an `@theme` block in globals.css.
// shadcn's `init`/`add` commands write their own `@theme inline` block into
// the same file, which redeclares three of the same keys
// (--color-background, --color-muted, --color-accent). Tailwind v4 merges
// duplicate @theme keys with last-declaration-wins, so whichever block is
// textually LAST in the file wins for those three keys. Task 2's block is
// currently kept last specifically to win that merge — nothing else
// enforces it. If a future `shadcn add` (or any edit) reintroduces a
// shadcn block below it, this test must fail.
//
// This compiles the real globals.css through the real Tailwind v4 PostCSS
// pipeline (the same plugin next.config/postcss.config uses) and asserts
// the *resolved* value of each token, not just that the text is present
// somewhere in the source — a shadowed declaration still contains the
// right-looking text, it just doesn't win.

const EXPECTED_TOKENS: Record<string, string> = {
  "--color-background": "#f5f7f3",
  "--color-surface": "#ffffff",
  "--color-text": "#17211b",
  "--color-muted": "#617068",
  "--color-line": "#dce4de",
  "--color-accent": "#256b46",
  "--color-accent-soft": "#e1f2e8",
};

async function compileGlobalsCss(): Promise<string> {
  const cssPath = fileURLToPath(new URL("./globals.css", import.meta.url));
  const css = readFileSync(cssPath, "utf8");
  const result = await postcss([tailwindcss()]).process(css, {
    from: cssPath,
  });
  return result.css;
}

function resolvedValuesFor(compiledCss: string, token: string): string[] {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${escaped}\\s*:\\s*([^;]+);`, "g");
  return [...compiledCss.matchAll(pattern)].map((match) => match[1].trim());
}

describe("globals.css 브랜드 토큰이 shadcn 블록에 가려지지 않는다", () => {
  it.each(Object.entries(EXPECTED_TOKENS))(
    "%s는 컴파일된 CSS에서 %s로 확정된다 (다른 값으로 덮이지 않는다)",
    async (token, expected) => {
      const compiled = await compileGlobalsCss();
      const values = resolvedValuesFor(compiled, token);

      // Exactly one surviving declaration in the compiled output, and it
      // must be Task 2's value. If a later shadcn block shadows it, this
      // either resolves to a second/different value or to shadcn's oklch
      // value instead of the expected hex.
      expect(values).toEqual([expected]);
    },
  );
});
