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

export function LoanFields() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<InputFormValues>();

  const housingStatus = watch("housing_status");

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
            : undefined
        }
        error={errors.housing_status?.message}
      >
        <select
          id="housing_status"
          className={SELECT_CLASS}
          {...register("housing_status")}
        >
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
          koreanUnitHint(watch("monthly_essential_expense")) +
          " · 총지출이 아니라 줄일 수 없는 생활비입니다. 기본값은 월평균지출 전액입니다."
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
