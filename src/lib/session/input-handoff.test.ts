import { beforeEach, describe, expect, it } from "vitest";

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
});
