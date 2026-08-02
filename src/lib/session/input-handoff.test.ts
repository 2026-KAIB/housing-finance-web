import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readInputHandoff, saveInputHandoff } from "./input-handoff";

const VALUES = {
  age: 24,
  household_size: 1,
  monthly_income: 2000000,
  monthly_average_expense: 1200000,
  current_assets: 8000000,
  target_region: "11650",
  target_price: 325000000,
  target_move_in_ym: "2028-07",
  risk_preference: "stability",
  monthly_savings_budget: 500000,
  lump_sum_budget: 0,
  emergency_reserve: 1000000,
  months: 360,
  housing_status: "NO_HOUSE",
  monthly_essential_expense: 1200000,
  exclusive_area_m2: 84,
} as never;

describe("입력 핸드오프", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("저장한 값을 그대로 돌려준다", () => {
    saveInputHandoff("persona_e", VALUES);

    expect(readInputHandoff("persona_e")).toEqual(VALUES);
  });

  it("다른 페르소나의 값을 돌려주지 않는다", () => {
    // 페르소나를 바꾼 뒤 이전 사람의 입력으로 계산하면 화면과 결과가
    // 서로 다른 사람을 가리킨다.
    saveInputHandoff("persona_e", VALUES);

    expect(readInputHandoff("persona_f")).toBeNull();
  });

  it("저장된 것이 없으면 null이다", () => {
    expect(readInputHandoff("persona_e")).toBeNull();
  });

  it("깨진 값이 들어 있으면 null이다", () => {
    sessionStorage.setItem("hf:input-handoff", "{not json");

    expect(readInputHandoff("persona_e")).toBeNull();
  });

  it("값이 빈 객체이면 null이다", () => {
    // JSON.parse는 성공하지만 필드가 하나도 없다 — 이전 버전이 다른
    // 필드 구성으로 저장했을 수 있다. 반쯤 채워진 객체를 그대로 돌려주면
    // 호출자가 값이 있는 것으로 착각한다.
    sessionStorage.setItem(
      "hf:input-handoff",
      JSON.stringify({ personaId: "persona_e", values: {} }),
    );

    expect(readInputHandoff("persona_e")).toBeNull();
  });

  it("서버(window 없음)에서는 값이 있어도 null이다", () => {
    // Node는 sessionStorage를 프로세스 전체에서 공유되는 전역으로 제공한다
    // — 서버 렌더에서 읽고 쓰면 다른 요청과 섞일 수 있다(kakao-loader.ts가
    // 같은 이유로 window를 가드하는 것과 동일). 서버에서는 항상 null이어야
    // 페르소나 기본값으로 정직하게 대체된다.
    saveInputHandoff("persona_e", VALUES);
    vi.stubGlobal("window", undefined);

    expect(readInputHandoff("persona_e")).toBeNull();
  });

  it("서버(window 없음)에서 saveInputHandoff는 아무것도 저장하지 않는다", () => {
    vi.stubGlobal("window", undefined);

    expect(() => saveInputHandoff("persona_e", VALUES)).not.toThrow();
  });

  it("값이 객체가 아니면 null이다", () => {
    sessionStorage.setItem(
      "hf:input-handoff",
      JSON.stringify({ personaId: "persona_e", values: "not-an-object" }),
    );

    expect(readInputHandoff("persona_e")).toBeNull();
  });
});
