import { describe, expect, it } from "vitest";

import { formatYm, formatYmShort, formatYmd } from "./date";

describe("formatYm", () => {
  it("YYYYMM을 한글로 바꾼다", () => {
    expect(formatYm("202607")).toBe("2026년 7월");
    expect(formatYm("202512")).toBe("2025년 12월");
  });

  it("6자리가 아니면 던진다", () => {
    expect(() => formatYm("2026")).toThrow("YYYYMM 형식이 아닙니다: 2026");
  });
});

describe("formatYmShort", () => {
  it("차트 축용 짧은 형식으로 바꾼다", () => {
    expect(formatYmShort("202607")).toBe("26.07");
  });
});

describe("formatYmd", () => {
  it("YYYYMMDD를 점 구분으로 바꾼다", () => {
    expect(formatYmd("20260820")).toBe("2026.08.20");
  });

  it("8자리가 아니면 던진다", () => {
    expect(() => formatYmd("202608")).toThrow(
      "YYYYMMDD 형식이 아닙니다: 202608",
    );
  });
});
