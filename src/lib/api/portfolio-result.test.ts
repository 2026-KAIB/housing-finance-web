import { describe, expect, it } from "vitest";

import type { InputFormValues } from "@/features/input/form-schema";
import { toFormValues } from "@/features/input/form-schema";
import { portfolioResultSchema } from "@/lib/contracts/result";
import { loadProfile } from "@/lib/fixtures/loader";

import { toPortfolioResult } from "./portfolio-result";

const PERSONA = "persona_e_college_student_basic";

const SIMULATION = {
  as_of: "2026-08-02",
  savings_portfolio: {
    run_status: "COMPLETED",
    section_schema_version: "savings-portfolio@1.1.0",
    engine_status: "COMPLETE",
    result: {
      status: "COMPLETE",
      coverage_ratio: "1",
      monthly_allocated: "500000",
      monthly_unallocated: "0",
      lump_sum_allocated: "0",
      lump_sum_unallocated: "0",
      expected_total_principal: "12000000",
      expected_maturity_amount: "12300000",
      expected_net_interest: "300000",
      allocations: [],
      reasons: [],
      final_policy_status: "PASS",
      final_policy_valid: true,
      validation_reasons: ["상품 X가 재검증에서 제외됨"],
    },
    missing_inputs: [],
    reasons: [],
    assumptions: [],
    policy_sources: [],
  },
};

async function map(simulation: unknown = SIMULATION) {
  const profile = await loadProfile(PERSONA);
  // persona_e_college_student_basic has no recorded finance.current_assets, so
  // toFormValues() leaves it undefined — honest for a prefill, but
  // toPortfolioResult declares InputFormValues (current_assets: required
  // number) because in production it only ever runs after LiveDashboard's
  // inputFormSchema.safeParse() gate, which refuses to call the API at all
  // until every required field — including this one — is filled in. Supply a
  // concrete value here to mirror that guarantee. Do not simplify this back
  // to toFormValues(profile): that would let `undefined` reach a
  // required field, which is exactly the case validation exists to prevent.
  return toPortfolioResult(simulation, profile, {
    ...toFormValues(profile),
    current_assets: 8000000,
  } as InputFormValues);
}

describe("toPortfolioResult", () => {
  it("정책 판정을 그대로 옮긴다", async () => {
    const result = await map();

    expect(result.final_policy_status).toBe("PASS");
    expect(result.final_policy_valid).toBe(true);
    expect(result.validation_reasons).toEqual(["상품 X가 재검증에서 제외됨"]);
  });

  it("정책 판정이 없으면 UNKNOWN이며 통과로 두지 않는다", async () => {
    const withoutPolicy = {
      ...SIMULATION,
      savings_portfolio: {
        ...SIMULATION.savings_portfolio,
        result: { ...SIMULATION.savings_portfolio.result, final_policy_status: undefined, final_policy_valid: undefined, validation_reasons: undefined },
      },
    };

    const result = await map(withoutPolicy);

    expect(result.final_policy_status).toBe("UNKNOWN");
    expect(result.final_policy_valid).toBe(false);
  });

  it("저축 절이 NOT_RUN이면 사유를 담아 INFEASIBLE로 만든다", async () => {
    const notRun = {
      as_of: "2026-08-02",
      savings_portfolio: {
        run_status: "NOT_RUN",
        section_schema_version: "savings-portfolio@1.1.0",
        engine_status: null,
        result: null,
        missing_inputs: ["savings_request"],
        reasons: ["저축 요청이 없어 계산하지 않았습니다."],
        assumptions: [],
        policy_sources: [],
      },
    };

    const result = await map(notRun);

    expect(result.status).toBe("INFEASIBLE");
    expect(result.reasons).toContain("저축 요청이 없어 계산하지 않았습니다.");
  });

  it("PARTIAL 상태를 그대로 옮긴다", async () => {
    // 엔진에는 있고 웹 계약에는 없던 값이다. 픽스처 20명에 없어서 드러나지
    // 않았을 뿐, 실시간 경로에서 나오면 파싱이 던진다.
    const partial = {
      ...SIMULATION,
      savings_portfolio: {
        ...SIMULATION.savings_portfolio,
        result: { ...SIMULATION.savings_portfolio.result, status: "PARTIAL" },
      },
    };

    const result = await map(partial);

    expect(result.status).toBe("PARTIAL");
    expect(result.success).toBe(false);
  });

  it("검토한 상품 집계는 실시간 경로에 없으므로 비운다", async () => {
    const result = await map();

    expect(result.evaluation).toBeUndefined();
  });

  it("계약을 통과하는 결과를 만든다", async () => {
    const result = await map();

    expect(portfolioResultSchema.safeParse(result).success).toBe(true);
  });
});
