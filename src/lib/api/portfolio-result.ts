import type { InputFormValues } from "@/features/input/form-schema";
import type { PersonaProfile } from "@/lib/contracts/persona";
import { type PortfolioResult, portfolioResultSchema } from "@/lib/contracts/result";

type Section = {
  run_status?: string;
  result?: Record<string, unknown> | null;
  reasons?: string[];
  missing_inputs?: string[];
};

function section(simulation: unknown): Section {
  const root = simulation as { savings_portfolio?: Section } | null;
  return root?.savings_portfolio ?? {};
}

export type NotRunSavingsSection = {
  missingInputs: string[];
  reasons: string[];
};

/**
 * 저축 절이 `NOT_RUN`이면 이름 있는 사유를 돌려주고, 아니면 `null`이다.
 *
 * 엔진이 계산을 거부한 것과 "조건을 만족하는 조합이 없다"는 서로 다른
 * 판정이다. 호출자는 이 함수로 NOT_RUN을 먼저 걸러내고, `toPortfolioResult`가
 * 그 결과를 INFEASIBLE로 뭉개기 전에 별도 화면을 그려야 한다.
 */
export function savingsSectionNotRun(
  simulation: unknown,
): NotRunSavingsSection | null {
  const sec = section(simulation);
  if (sec.run_status !== "NOT_RUN") return null;

  return {
    missingInputs: sec.missing_inputs ?? [],
    reasons: sec.reasons ?? [],
  };
}

/**
 * 저축 절 결과를 대시보드 뷰모델로 옮긴다.
 *
 * 필드 이름은 픽스처와 같다 — 픽스처도 같은 엔진 결과에서 나왔기 때문이다.
 * 계약이 문자열로 받는 금액은 문자열 그대로 넘긴다. 여기서 숫자로 바꾸면
 * 표시용 반올림이 계산용 값을 덮어쓴다.
 */
export function toPortfolioResult(
  simulation: unknown,
  profile: PersonaProfile,
  values: InputFormValues,
): PortfolioResult {
  const sec = section(simulation);
  const payload = sec.result ?? null;
  const asOf = (simulation as { as_of?: string })?.as_of ?? "";

  // 아래 금액들의 "0" 대체는 `payload`가 null일 때 — 즉 저축 절이 NOT_RUN일
  // 때 — 만 쓰인다. 계약이 이 필드들을 필수 문자열로 요구해서 자리를 비울 수
  // 없기 때문이다. 그때 status는 INFEASIBLE이고, 금액을 그리는
  // `PortfolioSummary`는 COMPLETE/PARTIAL에서만 렌더되므로 이 "0"은 화면에
  // 닿지 않는다. 사용자가 보는 것은 `PortfolioStatusNotice`의 사유 목록이다.
  // 이 조건이 바뀌면(예: 요약 카드를 모든 상태에서 그리게 되면) 0과 미계산이
  // 같은 값으로 보이므로, 그때는 계약을 optional로 바꿔야 한다.
  const candidate = {
    persona_id: profile.persona_id,
    display_name: profile.display_name,
    category: profile.category,
    status: (payload?.status as string) ?? "INFEASIBLE",
    success: payload?.status === "COMPLETE",
    coverage_ratio: String(payload?.coverage_ratio ?? "0"),
    monthly_allocated: String(payload?.monthly_allocated ?? "0"),
    monthly_unallocated: String(payload?.monthly_unallocated ?? "0"),
    lump_sum_allocated: String(payload?.lump_sum_allocated ?? "0"),
    lump_sum_unallocated: String(payload?.lump_sum_unallocated ?? "0"),
    expected_total_principal: String(payload?.expected_total_principal ?? "0"),
    expected_maturity_amount: String(payload?.expected_maturity_amount ?? "0"),
    expected_net_interest: String(payload?.expected_net_interest ?? "0"),
    // 판정이 없으면 UNKNOWN이다. PASS로 두면 미판정과 통과가 같은 값이 된다.
    final_policy_status: (payload?.final_policy_status as string) ?? "UNKNOWN",
    final_policy_valid: payload?.final_policy_valid === true,
    reasons: [...((payload?.reasons as string[]) ?? []), ...(sec.reasons ?? [])],
    validation_reasons: (payload?.validation_reasons as string[]) ?? [],
    allocations: (payload?.allocations as unknown[]) ?? [],
    input: {
      age: values.age,
      monthly_income: values.monthly_income,
      monthly_expense: values.monthly_average_expense,
      current_assets: values.current_assets,
      monthly_savings_budget: values.monthly_savings_budget,
      lump_sum_budget: values.lump_sum_budget,
      fund_needed_date: profile.savings.fund_needed_date,
    },
    source: { generator: "live-simulation", as_of: asOf },
  };

  return portfolioResultSchema.parse(candidate);
}
