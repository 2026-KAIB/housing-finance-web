import { describe, expect, it } from "vitest";

import {
  CHART_GRID,
  CHART_OTHER,
  CHART_SERIES,
  CHART_SURFACE,
  seriesColor,
} from "./chart-colors";

describe("차트 계열 색상", () => {
  // 검증기를 통과한 값이다. 바꾸려면 재검증이 필요하다:
  // node scripts/validate_palette.js "#eda100,#8a4b12" --mode light --surface "#faf7f1"
  it("검증된 2개 값으로 고정된다", () => {
    expect(CHART_SERIES).toEqual(["#eda100", "#8a4b12"]);
  });

  it("계열이 2개를 넘으면 브랜드 색을 순환하지 않고 중성색으로 떨어진다", () => {
    expect(seriesColor(0)).toBe("#eda100");
    expect(seriesColor(1)).toBe("#8a4b12");
    expect(seriesColor(2)).toBe(CHART_OTHER);
    expect(seriesColor(7)).toBe(CHART_OTHER);
  });

  it("그리드는 본문 구분선과 같은 값이라 뒤로 물러난다", () => {
    expect(CHART_GRID).toBe("#e7e0d4");
  });

  it("마크 사이 간격은 표면색과 같다", () => {
    expect(CHART_SURFACE).toBe("#ffffff");
  });
});
