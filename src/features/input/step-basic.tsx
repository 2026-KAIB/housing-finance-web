"use client";

import { useFormContext } from "react-hook-form";

import { Input } from "@/components/ui/input";
import type { PersonaProfile } from "@/lib/contracts/persona";
import {
  educationStatusLabel,
  employmentTypeLabel,
  housingTypeLabel,
  tuitionPayerLabel,
} from "@/lib/format/codes";
import { formatKoreanUnit } from "@/lib/format/money";

import { FieldRow, ReadonlyRow } from "./field-row";
import type { InputFormValues } from "./form-schema";

export function StepBasic({ profile }: { profile: PersonaProfile }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<InputFormValues>();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="grid gap-4">
        <FieldRow label="나이" htmlFor="age" error={errors.age?.message}>
          <Input id="age" type="number" {...register("age")} />
        </FieldRow>

        <FieldRow
          label="가구원수"
          htmlFor="household_size"
          error={errors.household_size?.message}
        >
          <Input
            id="household_size"
            type="number"
            {...register("household_size")}
          />
        </FieldRow>

        <FieldRow
          label="월 소득 (원)"
          htmlFor="monthly_income"
          hint={formatKoreanUnit(profile.finance.monthly_income)}
          error={errors.monthly_income?.message}
        >
          <Input
            id="monthly_income"
            type="number"
            {...register("monthly_income")}
          />
        </FieldRow>

        <FieldRow
          label="월 평균 지출 (원)"
          htmlFor="monthly_average_expense"
          hint={formatKoreanUnit(profile.finance.monthly_average_expense)}
          error={errors.monthly_average_expense?.message}
        >
          <Input
            id="monthly_average_expense"
            type="number"
            {...register("monthly_average_expense")}
          />
        </FieldRow>

        {profile.finance.current_assets !== undefined && (
          <FieldRow
            label="보유 자산 (원)"
            htmlFor="current_assets"
            error={errors.current_assets?.message}
          >
            <Input
              id="current_assets"
              type="number"
              {...register("current_assets")}
            />
          </FieldRow>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-bold text-muted">
          마이데이터에서 확인된 정보
        </h3>
        <ReadonlyRow
          label="학적"
          value={educationStatusLabel(profile.basic.education_status)}
        />
        <ReadonlyRow
          label="고용 형태"
          value={employmentTypeLabel(profile.basic.employment_type)}
        />
        <ReadonlyRow
          label="등록금 납부자"
          value={tuitionPayerLabel(profile.basic.tuition_payer)}
        />
        <ReadonlyRow
          label="현재 거주 형태"
          value={housingTypeLabel(profile.basic.current_housing_type)}
        />
        <ReadonlyRow
          label="부모님과 거주"
          value={profile.basic.lives_with_parents ? "예" : "아니오"}
        />
        <ReadonlyRow
          label="연 소득 (증빙)"
          value={formatKoreanUnit(profile.finance.annual_income_verified)}
        />
        {profile.finance.monthly_debt_payment !== undefined && (
          <ReadonlyRow
            label="월 부채 상환액"
            value={formatKoreanUnit(profile.finance.monthly_debt_payment)}
          />
        )}
      </div>
    </div>
  );
}
