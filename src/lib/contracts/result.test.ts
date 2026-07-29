import { describe, expect, it } from "vitest";

import { portfolioResultSchema } from "./result";

const base = {
  persona_id: "persona_e_college_student_basic",
  display_name: "대학생1(기본형)",
  category: "basic",
  status: "COMPLETE",
  success: true,
  coverage_ratio: "1",
  monthly_allocated: "100000",
  monthly_unallocated: "0",
  lump_sum_allocated: "300000",
  lump_sum_unallocated: "0",
  expected_total_principal: "2700000",
  expected_maturity_amount: "2774194.2000000",
  expected_net_interest: "74194.2000000",
  final_policy_status: "PASS",
  final_policy_valid: true,
  reasons: [],
  validation_reasons: [],
  allocations: [
    {
      product_name: "KB 국민프리미엄적금",
      product_kind: "installment_savings",
      allocation_amount: "100000",
      term_months: 24,
      maturity_date: "2028-07-28",
      expected_maturity_amount: "2462265.6000000",
      expected_net_interest: "62265.6000000",
      product_score: "85.54063388867203018409788706",
    },
  ],
  input: {
    age: 25,
    monthly_income: 800000,
    monthly_expense: 700000,
    current_assets: 1000000,
    monthly_savings_budget: 100000,
    lump_sum_budget: 300000,
    fund_needed_date: "20280728",
  },
  evaluation: { ELIGIBLE: 29, INELIGIBLE: 11 },
  source: { generator: "college_student_portfolio_results.json", as_of: "2026-07-28" },
};

describe("portfolioResultSchema", () => {
  it("COMPLETE 결과를 통과시킨다", () => {
    expect(portfolioResultSchema.parse(base).allocations).toHaveLength(1);
  });

  it("INFEASIBLE + 배분 0건 + UNKNOWN 정책을 통과시킨다", () => {
    const infeasible = {
      ...structuredClone(base),
      status: "INFEASIBLE",
      success: false,
      final_policy_status: "UNKNOWN",
      final_policy_valid: false,
      allocations: [],
      reasons: ["상품 최소 납입액, 예산 또는 예금자보호 제약을 만족하는 조합이 없습니다."],
    };

    const parsed = portfolioResultSchema.parse(infeasible);
    expect(parsed.allocations).toHaveLength(0);
    expect(parsed.reasons[0]).toContain("예금자보호");
  });

  it("금액을 숫자로 넣으면 거부한다 (엔진은 문자열로 준다)", () => {
    const invalid = structuredClone(base);
    invalid.expected_maturity_amount = 2774194.2 as unknown as string;
    expect(() => portfolioResultSchema.parse(invalid)).toThrow();
  });

  it("모르는 정책 상태를 거부한다", () => {
    const invalid = structuredClone(base);
    invalid.final_policy_status = "PENDING";
    expect(() => portfolioResultSchema.parse(invalid)).toThrow();
  });
});
