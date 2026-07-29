// @vitest-environment node
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import { describe, expect, it } from "vitest";

// Task 2's seven brand tokens live in an `@theme` block in globals.css.
// shadcn's `init`/`add` commands write their own `@theme inline` block into
// the same file, which redeclares two of the same keys
// (--color-background, --color-accent). Tailwind v4 merges duplicate
// @theme keys with last-declaration-wins, so whichever block is textually
// LAST in the file wins for those two keys. Task 2's block is currently
// kept last specifically to win that merge — nothing else enforces it. If
// a future `shadcn add` (or any edit) reintroduces a shadcn block below
// it, this test must fail.
//
// --color-muted is deliberately NOT one of Task 2's keys: it used to be
// (as a brand *text* color, #617068), but shadcn also owns --color-muted
// as a light *surface* token (bg-muted, used by TabsList, Button's
// outline/ghost hover, Badge, Card footer, Table). With Task 2's value
// textually last, it was winning the merge and painting shadcn's surfaces
// dark slate-green — e.g. the step 2 tab strip rendered at ~1.9:1 label
// contrast. The brand text color now lives under --color-brand-muted
// (text-brand-muted) instead, so --color-muted is free to resolve to
// shadcn's own near-white surface value. The second `it` below guards
// specifically against that collision coming back.
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
  "--color-brand-muted": "#617068",
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

  it("--color-muted은 shadcn의 표면 토큰이며 브랜드 텍스트색(#617068)으로 덮이지 않는다", async () => {
    const compiled = await compileGlobalsCss();
    const values = resolvedValuesFor(compiled, "--color-muted");

    // Regression guard for the collision itself: --color-muted must not
    // resolve to Task 2's old brand text value. If it does, some future
    // edit reintroduced a project-level --color-muted declaration and
    // shadcn surfaces (TabsList, Button hover, Badge, Card footer, Table)
    // would go dark slate-green again.
    expect(values).not.toEqual(["#617068"]);
  });
});
