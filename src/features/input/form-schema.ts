import { z } from "zod";

import type { PersonaProfile } from "@/lib/contracts/persona";
import { YM_INPUT, formatYmInput } from "@/lib/format/date";

// z.coerce.number() alone turns "" into 0 (Number("") === 0), so clearing a
// money field would silently pass validation as ₩0 instead of failing. This
// preprocess maps "" to undefined first so the empty case fails with a
// "missing" message, while an explicit 0 (some 취약형 personas legitimately
// have monthly_savings_budget/lump_sum_budget of 0) still passes.
const won = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce
    .number({ error: "금액을 입력하세요" })
    .min(0, "0 이상이어야 합니다"),
);

export const inputFormSchema = z.object({
  age: z.coerce.number().int().min(1, "나이를 입력하세요"),
  household_size: z.coerce.number().int().min(1, "가구원수를 입력하세요"),
  monthly_income: won,
  monthly_average_expense: won,
  current_assets: won.optional(),
  target_price: won,
  // 계약(픽스처)은 YYYYMM이지만 입력은 YYYY-MM으로 받는다. 경계 변환은
  // toFormValues(→ 폼)와 parseYmInput(→ 계약)이 담당한다.
  target_move_in_ym: z.string().regex(YM_INPUT, "YYYY-MM 형식으로 입력하세요"),
  risk_preference: z.string().min(1, "위험 성향을 선택하세요"),
  monthly_savings_budget: won,
  lump_sum_budget: won,
  emergency_reserve: won,
});

export type InputFormValues = z.infer<typeof inputFormSchema>;

export function toFormValues(profile: PersonaProfile): InputFormValues {
  return {
    age: profile.basic.age,
    household_size: profile.basic.household_size,
    monthly_income: profile.finance.monthly_income,
    monthly_average_expense: profile.finance.monthly_average_expense,
    current_assets: profile.finance.current_assets,
    target_price: profile.goal.target_price,
    target_move_in_ym: formatYmInput(profile.goal.target_move_in_ym),
    risk_preference: profile.goal.risk_preference,
    monthly_savings_budget: profile.savings.monthly_savings_budget,
    lump_sum_budget: profile.savings.lump_sum_budget,
    emergency_reserve: profile.savings.emergency_reserve,
  };
}

export function changedFields(
  defaults: InputFormValues,
  values: InputFormValues,
): string[] {
  return (Object.keys(defaults) as (keyof InputFormValues)[])
    .filter((key) => defaults[key] !== values[key])
    .map(String);
}
