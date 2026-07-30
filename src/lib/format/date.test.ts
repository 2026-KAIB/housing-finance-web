import { describe, expect, it } from "vitest";

import {
  formatIsoDate,
  formatYm,
  formatYmInput,
  formatYmShort,
  formatYmd,
  parseYmInput,
} from "./date";

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

describe("formatYmInput", () => {
  it("계약 형식 YYYYMM을 입력 형식 YYYY-MM으로 바꾼다", () => {
    expect(formatYmInput("202807")).toBe("2028-07");
    expect(formatYmInput("202912")).toBe("2029-12");
  });

  it("6자리가 아니면 던진다", () => {
    expect(() => formatYmInput("2028-07")).toThrow(
      "YYYYMM 형식이 아닙니다: 2028-07",
    );
  });
});

describe("parseYmInput", () => {
  it("입력 형식 YYYY-MM을 계약 형식 YYYYMM으로 바꾼다", () => {
    expect(parseYmInput("2028-07")).toBe("202807");
    expect(parseYmInput("2029-12")).toBe("202912");
  });

  it("구분자가 없으면 던진다", () => {
    expect(() => parseYmInput("202807")).toThrow(
      "YYYY-MM 형식이 아닙니다: 202807",
    );
  });

  it("월 범위를 벗어나면 던진다", () => {
    expect(() => parseYmInput("2028-13")).toThrow(
      "YYYY-MM 형식이 아닙니다: 2028-13",
    );
    expect(() => parseYmInput("2028-00")).toThrow(
      "YYYY-MM 형식이 아닙니다: 2028-00",
    );
  });

  it("formatYmInput의 결과를 그대로 되돌린다", () => {
    expect(parseYmInput(formatYmInput("202807"))).toBe("202807");
  });
});

describe("formatIsoDate", () => {
  it("YYYY-MM-DD를 점 구분으로 바꾼다", () => {
    expect(formatIsoDate("2026-08-20")).toBe("2026.08.20");
  });

  it("YYYY-MM-DD 형식이 아니면 던진다", () => {
    expect(() => formatIsoDate("20260820")).toThrow(
      "YYYY-MM-DD 형식이 아닙니다: 20260820",
    );
  });
});
