import { z } from "zod";

import { isSeoulDistrict } from "@/lib/constants/seoul-districts";
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

/** LTV 비율을 가르는 차주 구분. core의 `HousingStatus`(6·27 방안)와 같은 값이다. */
export const HOUSING_STATUS_OPTIONS = [
  "NO_HOUSE",
  "FIRST_HOME_BUYER",
  "ONE_HOUSE_DISPOSAL_PLEDGED",
  "ONE_HOUSE_KEEPING",
  "MULTI_HOUSE",
] as const;

/** 주택담보대출 만기(개월). 10·20·30·40년. */
export const LOAN_TERM_OPTIONS = [120, 240, 360, 480] as const;

export const inputFormSchema = z.object({
  age: z.coerce.number().int().min(1, "나이를 입력하세요"),
  household_size: z.coerce.number().int().min(1, "가구원수를 입력하세요"),
  monthly_income: won,
  monthly_average_expense: won,
  current_assets: won,
  target_region: z.string().min(1, "지역을 선택하세요"),
  target_price: won,
  // 계약(픽스처)은 YYYYMM이지만 입력은 YYYY-MM으로 받는다. 경계 변환은
  // toFormValues(→ 폼)와 parseYmInput(→ 계약)이 담당한다.
  target_move_in_ym: z.string().regex(YM_INPUT, "YYYY-MM 형식으로 입력하세요"),
  risk_preference: z.string().min(1, "위험 성향을 선택하세요"),
  monthly_savings_budget: won,
  lump_sum_budget: won,
  emergency_reserve: won,
  months: z.coerce
    .number()
    .int()
    .refine((value) => LOAN_TERM_OPTIONS.includes(value as 120), "만기를 선택하세요"),
  housing_status: z
    .string()
    .refine(
      (value) => HOUSING_STATUS_OPTIONS.includes(value as "NO_HOUSE"),
      "주택 보유 상태를 선택하세요",
    ),
  monthly_essential_expense: won,
  exclusive_area_m2: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number({ error: "전용면적을 입력하세요" }).gt(0, "0보다 커야 합니다"),
  ),
});

export type InputFormValues = z.infer<typeof inputFormSchema>;

/**
 * toFormValues()가 실제로 돌려주는 모양. current_assets만 InputFormValues와
 * 다르다 — 제출 시엔 필수이지만, 일부 페르소나(예: 대학생)는 프로필에 자산
 * 정보가 없어 프리필할 값이 없다. 모르는 값을 0으로 채우면 "0원 보유"와
 * "모름"을 같은 값으로 뭉개는 것이므로, 그런 페르소나는 정직하게
 * current_assets가 없는 채로 돌려주고 사용자가 직접 입력하게 한다. 캐스트로
 * 타입을 속이면 이 함수를 거치지 않고 곧장 페이로드를 만드는 호출자가
 * undefined를 number로 착각해 그대로 흘려보낼 수 있다.
 */
export type FormDefaults = Omit<InputFormValues, "current_assets"> & {
  current_assets?: number;
};

export function toFormValues(profile: PersonaProfile): FormDefaults {
  return {
    age: profile.basic.age,
    household_size: profile.basic.household_size,
    monthly_income: profile.finance.monthly_income,
    monthly_average_expense: profile.finance.monthly_average_expense,
    current_assets: profile.finance.current_assets,
    // 서울 25개 구가 아니면 미선택으로 떨어뜨린다. 검증되지 않은 코드를
    // 드롭다운 값으로 흘리는 것보다 사용자가 직접 고르게 하는 편이 안전하다.
    target_region: isSeoulDistrict(profile.goal.target_region)
      ? profile.goal.target_region
      : "",
    target_price: profile.goal.target_price,
    target_move_in_ym: formatYmInput(profile.goal.target_move_in_ym),
    risk_preference: profile.goal.risk_preference,
    monthly_savings_budget: profile.savings.monthly_savings_budget,
    lump_sum_budget: profile.savings.lump_sum_budget,
    emergency_reserve: profile.savings.emergency_reserve,
    // 만기는 사용자가 고르는 값이다. 30년이 주택담보대출 표준.
    months: 360,
    // 생애최초(LTV 70%)를 기본값으로 두지 않는다. 무주택(40%)에서 시작해
    // 사용자가 직접 주장하게 한다 — 모르는 값을 유리한 쪽에 두지 않는다.
    housing_status: "NO_HOUSE",
    // 지출 전액을 필수로 본다. 비율을 도입하면 근거 없는 숫자가 계산에
    // 들어가고, 필수생활비가 작을수록 Buffer가 작아져 한도가 커진다.
    monthly_essential_expense: profile.finance.monthly_average_expense,
    // 목표가가 전용 85㎡ 이하 실거래에서 나온 값이다.
    exclusive_area_m2: 84,
  };
}
