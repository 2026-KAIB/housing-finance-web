"use client";

import { useFormContext } from "react-hook-form";

import { Input } from "@/components/ui/input";
import type { PersonaProfile } from "@/lib/contracts/persona";
import { formatKoreanUnit } from "@/lib/format/money";

import { FieldRow } from "./field-row";
import type { InputFormValues } from "./form-schema";

export function SavingsFields({ profile }: { profile: PersonaProfile }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<InputFormValues>();

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <FieldRow
        label="월 저축 예산 (원)"
        htmlFor="monthly_savings_budget"
        hint={formatKoreanUnit(profile.savings.monthly_savings_budget)}
        error={errors.monthly_savings_budget?.message}
      >
        <Input
          id="monthly_savings_budget"
          type="number"
          {...register("monthly_savings_budget")}
        />
      </FieldRow>

      <FieldRow
        label="일시 예치금 (원)"
        htmlFor="lump_sum_budget"
        hint={formatKoreanUnit(profile.savings.lump_sum_budget)}
        error={errors.lump_sum_budget?.message}
      >
        <Input
          id="lump_sum_budget"
          type="number"
          {...register("lump_sum_budget")}
        />
      </FieldRow>

      <FieldRow
        label="비상 예비금 (원)"
        htmlFor="emergency_reserve"
        hint={formatKoreanUnit(profile.savings.emergency_reserve)}
        error={errors.emergency_reserve?.message}
      >
        <Input
          id="emergency_reserve"
          type="number"
          {...register("emergency_reserve")}
        />
      </FieldRow>
    </div>
  );
}
