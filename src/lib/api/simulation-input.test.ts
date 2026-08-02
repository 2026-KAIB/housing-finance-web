import { describe, expect, it } from "vitest";

import { toFormValues } from "@/features/input/form-schema";
import { loadProfile } from "@/lib/fixtures/loader";

import { buildSimulationInput } from "./simulation-input";

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
});
