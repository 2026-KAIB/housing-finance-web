import { describe, expect, it } from "vitest";

import { toFormValues } from "@/features/input/form-schema";
import { loadProfile } from "@/lib/fixtures/loader";

import { buildSimulationInput, FIXED_ACQUISITION_ASSUMPTIONS } from "./simulation-input";

const PERSONA = "persona_e_college_student_basic";

async function build(overrides: Record<string, unknown> = {}) {
  const profile = await loadProfile(PERSONA);
  return buildSimulationInput(
    { ...toFormValues(profile), ...overrides } as never,
    profile,
  );
}

describe("buildSimulationInput", () => {
  it("목표 시점 YYYY-MM을 그 달 1일로 옮긴다", async () => {
    const input = await build({ target_move_in_ym: "2028-07" });

    expect(input.housing_goal.target_date).toBe("2028-07-01");
  });

  it("연소득은 폼이 아니라 프로필의 검증된 값에서 온다", async () => {
    const profile = await loadProfile(PERSONA);
    const input = await build();

    expect(input.profile.annual_income).toBe(
      profile.finance.annual_income_verified,
    );
  });

  it("생애최초를 고를 때만 is_first_home_buyer가 참이다", async () => {
    expect((await build({ housing_status: "NO_HOUSE" })).profile.is_first_home_buyer).toBe(false);
    expect(
      (await build({ housing_status: "FIRST_HOME_BUYER" })).profile.is_first_home_buyer,
    ).toBe(true);
  });

  it("취득 후 보유주택수를 주택보유상태에서 유도한다", async () => {
    const noHouse = await build({ housing_status: "NO_HOUSE" });
    const keeping = await build({ housing_status: "ONE_HOUSE_KEEPING" });

    expect(noHouse.acquisition_costs.household_home_count_after_purchase).toBe(1);
    expect(keeping.acquisition_costs.household_home_count_after_purchase).toBe(2);
  });

  it("다주택은 취득 후 주택수를 확정하지 않는다", async () => {
    // 2주택 이상은 '2채'가 아니라 '2채 이상'이라는 뜻이다. 3을 적으면
    // 4주택 차주를 통과시키고, 그것은 세액을 작게 잡는 방향이다.
    const input = await build({ housing_status: "MULTI_HOUSE" });

    expect(
      input.acquisition_costs.household_home_count_after_purchase,
    ).toBeUndefined();
  });

  it("대출 요청 세 값을 폼에서 그대로 가져온다", async () => {
    const input = await build({
      months: 240,
      monthly_essential_expense: 900000,
    });

    expect(input.loan_request.months).toBe(240);
    expect(input.loan_request.housing_status).toBe("NO_HOUSE");
    expect(input.loan_request.monthly_essential_expense).toBe(900000);
  });

  it("유동자산은 폼의 보유자산이며 0으로 대체하지 않는다", async () => {
    const input = await build({ current_assets: 8000000 });

    expect(input.financial_snapshot.liquid_assets).toBe(8000000);
  });

  it("고급주택 아님을 가정으로 명시한다", async () => {
    const input = await build();

    expect(input.acquisition_costs.is_luxury_home).toBe(false);
  });

  it("전용면적 84㎡ 고정을 취득세를 과소 계산하는 방향으로 명시한다", async () => {
    // 84는 <=85 국민주택규모(농어촌특별세 없음)를 확정한다. 실제 면적이
    // 85~100㎡이면 엔진은 그 여부를 확정하지 못하는데(None), 84로 고정하면
    // 그 미확정을 "세금 없음"(True)으로 만들어버린다 — 취득세를 실제보다
    // 작게 보이게 하는 방향이므로 고급주택 가정과 같은 이유로 화면에 밝혀야
    // 한다.
    const input = await build();

    expect(input.acquisition_costs.exclusive_area_m2).toBe(84);
    expect(
      FIXED_ACQUISITION_ASSUMPTIONS.some((note) => note.includes("전용면적")),
    ).toBe(true);
  });
});

describe("FIXED_ACQUISITION_ASSUMPTIONS", () => {
  // 이 목록의 각 항목은 사용자에게 실제로 공개되는 가정이다(ReportViewer가
  // 그대로 렌더한다). 새 고정 가정을 추가하면서 이 개수를 갱신하지 않으면,
  // 그 가정이 공개 없이 조용히 계산에만 반영되는 사고가 재발할 수 있다.
  it("네 가지 고정 가정을 모두 담는다", () => {
    expect(FIXED_ACQUISITION_ASSUMPTIONS).toHaveLength(4);
  });

  it("고급주택 가정과 전용면적 가정 모두 비용이 커지는 방향임을 밝힌다", () => {
    const luxury = FIXED_ACQUISITION_ASSUMPTIONS.find((note) =>
      note.includes("고급주택"),
    );
    const area = FIXED_ACQUISITION_ASSUMPTIONS.find((note) =>
      note.includes("전용면적"),
    );

    expect(luxury).toContain("실제 비용은 더 큽니다");
    expect(area).toContain("실제 취득세는 이 계산보다 커질 수 있습니다");
  });
});
