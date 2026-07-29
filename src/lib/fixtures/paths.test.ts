import { describe, expect, it } from "vitest";

import { transactionsUrl } from "./paths";

const SAMPLE = "persona_e_college_student_basic";

describe("transactionsUrl", () => {
  it("public 정적 경로를 돌려준다", () => {
    expect(transactionsUrl(SAMPLE)).toBe(`/fixtures/${SAMPLE}/transactions.json`);
  });
});
