import type { InputFormValues } from "@/features/input/form-schema";
import type { PersonaProfile } from "@/lib/contracts/persona";

/**
 * `POST /api/v1/simulations`와 `POST /api/v1/reports`가 받는 본문.
 *
 * core의 `app/schemas/simulation.py`가 정하는 모양이다. 이 파일 밖에서는
 * 이 모양을 알지 못한다 — 경계를 한 곳에 가둔다.
 */
export type SimulationInputPayload = {
  profile: {
    age: number;
    household_size: number;
    annual_income: number;
    employment_type: string | null;
    is_first_home_buyer: boolean;
    is_married: boolean;
  };
  housing_goal: {
    goal_type: "HOME_PURCHASE";
    target_price: number;
    target_date: string;
    region_code: string;
  };
  financial_snapshot: {
    monthly_income: number;
    monthly_expense: number;
    liquid_assets: number;
    monthly_debt_payment: number;
    emergency_reserve: number;
  };
  loan_request: {
    months: number;
    housing_status: string;
    monthly_essential_expense: number;
  };
  savings_request: {
    fund_needed_date: string;
    monthly_savings_budget: number;
    lump_sum_budget: number;
    liquidity_preference: string;
    accepts_principal_risk: boolean;
    maximum_recommended_products: number;
  };
  acquisition_costs: {
    buyer_is_corporation: boolean;
    is_registered_housing: boolean;
    is_luxury_home: boolean;
    exclusive_area_m2: number;
    household_home_count_after_purchase?: number;
  };
};

/**
 * 이 서비스 범위에서 고정한 취득 사실. **화면에 가정임을 표시한다.**
 *
 * 목표가를 사용자가 직접 바꿀 수 있으므로 조용히 두지 않는다.
 */
export const FIXED_ACQUISITION_ASSUMPTIONS = [
  "매수자는 개인이며 법인이 아닌 것으로 계산했습니다.",
  "취득 대상은 주택으로 계산했습니다.",
  "고급주택이 아닌 것으로 계산했습니다. 고급주택이면 취득세가 중과되어 실제 비용은 더 큽니다.",
] as const;

/** `YYYY-MM` → `YYYY-MM-01`. 계약은 날짜를 요구하고 폼은 월까지만 받는다. */
function firstOfMonth(ym: string): string {
  return `${ym}-01`;
}

/** `YYYYMMDD` → `YYYY-MM-DD`. 프로필의 `fund_needed_date` 형식이다. */
function isoFromYmd(ymd: string): string {
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

/**
 * 취득 후 보유주택수.
 *
 * `MULTI_HOUSE`는 채우지 않는다. 2주택 이상은 '2채'가 아니라 '2채 이상'이라는
 * 뜻이어서 숫자를 적으면 더 많이 가진 차주를 통과시키고, 그것은 세액을 작게
 * 잡는 방향이다. 같은 이유로 core의 `_user_facts()`도 이 경우를 비운다.
 */
function homeCountAfterPurchase(status: string): number | undefined {
  if (status === "NO_HOUSE" || status === "FIRST_HOME_BUYER") return 1;
  if (status === "ONE_HOUSE_DISPOSAL_PLEDGED" || status === "ONE_HOUSE_KEEPING") return 2;
  return undefined;
}

export function buildSimulationInput(
  values: InputFormValues,
  profile: PersonaProfile,
): SimulationInputPayload {
  const homeCount = homeCountAfterPurchase(values.housing_status);

  return {
    profile: {
      age: values.age,
      household_size: values.household_size,
      // 연소득은 폼에 없다. 검증된 값을 쓰고 월소득 × 12로 지어내지 않는다.
      annual_income: profile.finance.annual_income_verified,
      employment_type: profile.basic.employment_type,
      is_first_home_buyer: values.housing_status === "FIRST_HOME_BUYER",
      is_married: profile.basic.marital_status === "married",
    },
    housing_goal: {
      goal_type: "HOME_PURCHASE",
      target_price: values.target_price,
      target_date: firstOfMonth(values.target_move_in_ym),
      region_code: values.target_region,
    },
    financial_snapshot: {
      monthly_income: values.monthly_income,
      monthly_expense: values.monthly_average_expense,
      liquid_assets: values.current_assets,
      monthly_debt_payment: profile.finance.monthly_debt_payment ?? 0,
      emergency_reserve: values.emergency_reserve,
    },
    loan_request: {
      months: values.months,
      housing_status: values.housing_status,
      monthly_essential_expense: values.monthly_essential_expense,
    },
    savings_request: {
      fund_needed_date: isoFromYmd(profile.savings.fund_needed_date),
      monthly_savings_budget: values.monthly_savings_budget,
      lump_sum_budget: values.lump_sum_budget,
      liquidity_preference: profile.savings.liquidity_preference,
      accepts_principal_risk: profile.savings.accepts_principal_risk,
      maximum_recommended_products: profile.savings.maximum_recommended_products,
    },
    acquisition_costs: {
      buyer_is_corporation: false,
      is_registered_housing: true,
      is_luxury_home: false,
      exclusive_area_m2: values.exclusive_area_m2,
      ...(homeCount === undefined
        ? {}
        : { household_home_count_after_purchase: homeCount }),
    },
  };
}
