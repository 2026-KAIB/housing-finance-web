import { describe, expect, it } from "vitest";

import {
  mydataSchema,
  personaIndexSchema,
  personaProfileSchema,
  transactionsSchema,
} from "./persona";

const source = { generator: "generate_all.py", as_of: "2026-07-24" };

describe("personaIndexSchema", () => {
  const valid = {
    as_of: "20260728",
    personas: [
      {
        persona_id: "persona_e_college_student_basic",
        display_name: "대학생1(기본형)",
        category: "basic",
        headline: {
          age: 25,
          monthly_income: 800000,
          monthly_expense: 700000,
          target_price: 5000000,
          target_move_in_ym: "202807",
        },
        portfolio_status: "COMPLETE",
      },
    ],
  };

  it("정상 목록을 통과시킨다", () => {
    expect(personaIndexSchema.parse(valid).personas).toHaveLength(1);
  });

  it("모르는 portfolio_status를 거부한다", () => {
    const invalid = structuredClone(valid);
    invalid.personas[0].portfolio_status = "PARTIAL";
    expect(() => personaIndexSchema.parse(invalid)).toThrow();
  });

  it("target_move_in_ym이 YYYYMM이 아니면 거부한다", () => {
    const invalid = structuredClone(valid);
    invalid.personas[0].headline.target_move_in_ym = "2028-07";
    expect(() => personaIndexSchema.parse(invalid)).toThrow();
  });
});

describe("personaProfileSchema", () => {
  const valid = {
    persona_id: "persona_e_college_student_basic",
    display_name: "대학생1(기본형)",
    category: "basic",
    basic: {
      birth_date: "20010315",
      age: 25,
      education_status: "university_student",
      military_service_status: "completed",
      employment_type: "part_time",
      marital_status: "single",
      household_size: 3,
      lives_with_parents: true,
      tuition_payer: "parents",
      current_housing_type: "living_with_parents",
    },
    goal: {
      target_housing_type: "monthly_rent",
      target_region: "30200",
      target_price: 5000000,
      target_lease_deposit: 5000000,
      target_monthly_rent: 200000,
      target_management_fee: 50000,
      target_move_in_ym: "202807",
      risk_preference: "stability",
    },
    finance: {
      annual_income_verified: 9600000,
      monthly_income: 800000,
      monthly_average_expense: 700000,
    },
    savings: {
      fund_needed_date: "20280728",
      monthly_savings_budget: 100000,
      lump_sum_budget: 300000,
      emergency_reserve: 700000,
      liquidity_preference: "high",
      accepts_principal_risk: false,
      maximum_recommended_products: 2,
    },
    source,
  };

  it("current_assets 없이도 통과시킨다 (persona_e는 이 필드가 없다)", () => {
    expect(personaProfileSchema.parse(valid).finance.current_assets).toBeUndefined();
  });

  it("current_assets가 있으면 받아들인다", () => {
    const withAssets = structuredClone(valid);
    (withAssets.finance as Record<string, any>).current_assets = 1000000;
    (withAssets.finance as Record<string, any>).monthly_debt_payment = 0;
    expect(personaProfileSchema.parse(withAssets).finance.current_assets).toBe(1000000);
  });

  it("필수 필드가 빠지면 거부한다", () => {
    const invalid = structuredClone(valid);
    delete (invalid.savings as Record<string, any>).monthly_savings_budget;
    expect(() => personaProfileSchema.parse(invalid)).toThrow();
  });
});

describe("mydataSchema", () => {
  const valid = {
    persona_id: "persona_e_college_student_basic",
    as_of: "20260724",
    accounts: [
      {
        account_num_masked: "4010-**-**0001",
        prod_name: "KB국민 대학생 생활통장",
        account_type: "1001",
        account_type_label: "수시입출금",
        account_kind: "demand",
        saving_method: "01",
        saving_method_label: "자유입출금",
        balance_amt: 1000000,
        withdrawable_amt: 1000000,
        offered_rate: 0.001,
        issue_date: "20240102",
        has_transactions: true,
      },
    ],
    loans: [],
    monthly_summary: [
      { ym: "202607", income: 800000, expense: 700000, interest: 3360, net: 100000 },
    ],
    totals: {
      account_count: 1,
      loan_count: 0,
      total_balance: 1000000,
      total_loan_balance: 0,
    },
    derived_by: "fixture-script",
    source,
  };

  it("정상 마이데이터를 통과시킨다", () => {
    expect(mydataSchema.parse(valid).accounts[0].account_kind).toBe("demand");
  });

  it("계좌번호가 마스킹되지 않으면 거부한다", () => {
    const invalid = structuredClone(valid);
    invalid.accounts[0].account_num_masked = "40100102000001";
    expect(() => mydataSchema.parse(invalid)).toThrow();
  });

  it("account_kind가 loan이면 accounts에 들어올 수 없다", () => {
    const invalid = structuredClone(valid);
    invalid.accounts[0].account_kind = "loan";
    expect(() => mydataSchema.parse(invalid)).toThrow();
  });

  it("derived_by 플래그가 없으면 거부한다", () => {
    const invalid = structuredClone(valid);
    delete (invalid as Record<string, any>).derived_by;
    expect(() => mydataSchema.parse(invalid)).toThrow();
  });
});

describe("transactionsSchema", () => {
  it("계좌번호를 키로 하는 거래 묶음을 통과시킨다", () => {
    const parsed = transactionsSchema.parse({
      persona_id: "persona_e_college_student_basic",
      accounts: {
        "4010-**-**0001": {
          trans_list: [
            {
              trans_dtime: "20260723194656",
              trans_no: "00000304",
              trans_type: "02",
              trans_type_label: "출금",
              trans_class: "체크카드",
              trans_amt: 25500,
              balance_amt: 1000000,
              trans_memo: "서점",
            },
          ],
        },
      },
      source,
    });

    expect(parsed.accounts["4010-**-**0001"].trans_list).toHaveLength(1);
  });
});
