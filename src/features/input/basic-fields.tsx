"use client";

import { useFormContext } from "react-hook-form";

import { Input } from "@/components/ui/input";
import type { PersonaProfile } from "@/lib/contracts/persona";
import { koreanUnitHint } from "@/lib/format/money";

import { FieldRow } from "./field-row";
import type { InputFormValues } from "./form-schema";

export function BasicFields({ profile }: { profile: PersonaProfile }) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<InputFormValues>();

  return (
    <div className="grid gap-4 md:grid-cols-2">
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
        hint={koreanUnitHint(watch("monthly_income"))}
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
        hint={koreanUnitHint(watch("monthly_average_expense"))}
        error={errors.monthly_average_expense?.message}
      >
        <Input
          id="monthly_average_expense"
          type="number"
          {...register("monthly_average_expense")}
        />
      </FieldRow>

      <FieldRow
        label="보유 자산 (원)"
        htmlFor="current_assets"
        error={errors.current_assets?.message}
        hint={koreanUnitHint(watch("current_assets"))}
      >
        <Input
          id="current_assets"
          type="number"
          {...register("current_assets")}
        />
      </FieldRow>
    </div>
  );
}
