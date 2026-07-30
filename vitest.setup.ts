import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// vitest.config.ts does not set `test.globals: true`, so
// @testing-library/react's own auto-cleanup (which only registers when it
// finds a *global* `afterEach`) never fires. Without this, DOM trees from
// one test in a file leak into the next `render()` call in the same file,
// producing duplicate-match failures. This is the standard explicit-cleanup
// setup Testing Library documents for non-globals Vitest configs.
afterEach(() => {
  cleanup();
});
