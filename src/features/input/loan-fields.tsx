"use client";

import { useFormContext } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { housingStatusLabel, loanTermLabel } from "@/lib/format/codes";
import { koreanUnitHint } from "@/lib/format/money";

import { FieldRow } from "./field-row";
import {
  HOUSING_STATUS_OPTIONS,
  LOAN_TERM_OPTIONS,
  type InputFormValues,
} from "./form-schema";

const SELECT_CLASS =
  "h-9 rounded-md border border-line bg-surface px-3 text-sm";

const MONTHLY_ESSENTIAL_EXPENSE_EXPLANATION =
  "총지출이 아니라 줄일 수 없는 생활비입니다. 기본값은 월평균지출 전액입니다.";

export function LoanFields() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<InputFormValues>();

  const housingStatus = watch("housing_status");
  // 필드가 비어 있으면 koreanUnitHint가 undefined를 돌려준다(money.ts 참고).
  // "+"로 그냥 이어붙이면 "undefined · ..."가 그대로 화면에 남는다. 설명
  // 문구는 값이 없을 때도 계속 보여야 하므로(FieldRow의 hint && !error 가드로
  // 통째로 지워버리지 않는다), 금액 부분만 없을 때 깔끔히 사라지게 한다.
  const essentialExpenseHint = koreanUnitHint(
    watch("monthly_essential_expense"),
  );

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <FieldRow label="만기" htmlFor="months" error={errors.months?.message}>
        <select id="months" className={SELECT_CLASS} {...register("months")}>
          {LOAN_TERM_OPTIONS.map((months) => (
            <option key={months} value={months}>
              {loanTermLabel(months)}
            </option>
          ))}
        </select>
      </FieldRow>

      <FieldRow
        label="주택 보유 상태"
        htmlFor="housing_status"
        hint={
          housingStatus === "FIRST_HOME_BUYER"
            ? "생애최초는 LTV 70%가 적용됩니다. 무주택(40%)보다 한도가 큽니다."
            : housingStatus
              ? undefined
              : "주택을 보유하고 계셔서 프로필만으로는 정할 수 없습니다. 규제지역 LTV가 처분조건부·미처분·다주택에 따라 0%까지 갈립니다."
        }
        error={errors.housing_status?.message}
      >
        <select
          id="housing_status"
          className={SELECT_CLASS}
          {...register("housing_status")}
        >
          {!housingStatus && (
            // 프로필이 확정하지 못한 경우(유주택)에만 나타난다. 이게 없으면
            // 브라우저가 첫 항목을 고른 것처럼 보이는데, 그 항목은
            // 무주택(LTV 40%)이라 유주택자에게는 고르지도 않은 값으로
            // 한도가 열린다.
            <option value="">선택하세요</option>
          )}
          {HOUSING_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {housingStatusLabel(status)}
            </option>
          ))}
        </select>
      </FieldRow>

      <FieldRow
        label="필수 생활비 (원)"
        htmlFor="monthly_essential_expense"
        hint={
          essentialExpenseHint
            ? `${essentialExpenseHint} · ${MONTHLY_ESSENTIAL_EXPENSE_EXPLANATION}`
            : MONTHLY_ESSENTIAL_EXPENSE_EXPLANATION
        }
        error={errors.monthly_essential_expense?.message}
      >
        <Input
          id="monthly_essential_expense"
          type="number"
          {...register("monthly_essential_expense")}
        />
      </FieldRow>
    </div>
  );
}
