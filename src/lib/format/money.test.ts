import { describe, expect, it } from "vitest";

import {
  formatKoreanUnit,
  formatRate,
  formatScore,
  formatWon,
  koreanUnitHint,
  toNumber,
} from "./money";

describe("toNumber", () => {
  it("엔진이 주는 소수 문자열을 숫자로 바꾼다", () => {
    expect(toNumber("2774194.2000000")).toBeCloseTo(2774194.2, 5);
  });

  it("숫자는 그대로 통과시킨다", () => {
    expect(toNumber(1000)).toBe(1000);
  });

  it("숫자가 아니면 던진다", () => {
    expect(() => toNumber("N/A")).toThrow("숫자로 변환할 수 없는 값: N/A");
  });
});

describe("formatWon", () => {
  it("소수를 반올림하고 천단위 구분자를 넣는다", () => {
    expect(formatWon("2774194.2000000")).toBe("2,774,194원");
  });

  it("0원을 표시한다", () => {
    expect(formatWon(0)).toBe("0원");
  });
});

describe("formatKoreanUnit", () => {
  it("억·만·원 단위를 모두 표시한다", () => {
    expect(formatKoreanUnit(450000000)).toBe("4억 5,000만원");
    expect(formatKoreanUnit("2774194.2000000")).toBe("277만 4,194원");
    expect(formatKoreanUnit(12400000)).toBe("1,240만원");
    expect(formatKoreanUnit(800000)).toBe("80만원");
    expect(formatKoreanUnit(3683)).toBe("3,683원");
  });

  it("0은 0원이다", () => {
    expect(formatKoreanUnit(0)).toBe("0원");
  });

  it("음수는 부호를 앞에 붙인다", () => {
    expect(formatKoreanUnit(-700000)).toBe("-70만원");
  });
});

describe("koreanUnitHint", () => {
  it("입력값을 한글 단위로 바꾼다", () => {
    expect(koreanUnitHint(700000)).toBe("70만원");
    expect(koreanUnitHint(0)).toBe("0원");
  });

  it("숫자 입력이 돌려주는 문자열도 받는다", () => {
    // <input type="number">는 값을 문자열로 돌려준다.
    expect(koreanUnitHint("700000")).toBe("70만원");
  });

  it("비어 있으면 힌트를 숨긴다", () => {
    for (const blank of ["", undefined, null]) {
      expect(koreanUnitHint(blank)).toBeUndefined();
    }
  });

  it("숫자로 볼 수 없으면 던지지 않고 힌트를 숨긴다", () => {
    // formatKoreanUnit은 이런 값에 throw한다. 힌트가 라이브 입력에 붙는
    // 이상 렌더 중에 던지면 화면 전체가 죽으므로 여기서 막는다.
    expect(koreanUnitHint("N/A")).toBeUndefined();
    expect(koreanUnitHint(Number.NaN)).toBeUndefined();
  });
});

describe("formatRate", () => {
  it("소수 금리를 연이율 퍼센트로 바꾼다", () => {
    expect(formatRate(0.021)).toBe("연 2.1%");
    expect(formatRate(0.001)).toBe("연 0.1%");
    expect(formatRate(0.034)).toBe("연 3.4%");
    expect(formatRate(0)).toBe("연 0%");
  });
});

describe("formatScore", () => {
  it("긴 소수 점수를 두 자리로 줄인다", () => {
    expect(formatScore("85.54063388867203018409788706")).toBe("85.54");
  });
});
