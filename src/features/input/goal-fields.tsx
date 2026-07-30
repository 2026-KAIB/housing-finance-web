"use client";

import { useFormContext } from "react-hook-form";

import { Input } from "@/components/ui/input";
import type { PersonaProfile } from "@/lib/contracts/persona";
import { riskPreferenceLabel } from "@/lib/format/codes";
import { formatKoreanUnit } from "@/lib/format/money";

import { FieldRow } from "./field-row";
import type { InputFormValues } from "./form-schema";

const RISK_OPTIONS = ["stability", "balanced", "aggressive"];

export function GoalFields({ profile }: { profile: PersonaProfile }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<InputFormValues>();

  const options = RISK_OPTIONS.includes(profile.goal.risk_preference)
    ? RISK_OPTIONS
    : [...RISK_OPTIONS, profile.goal.risk_preference];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <FieldRow
        label="목표 금액 (원)"
        htmlFor="target_price"
        hint={formatKoreanUnit(profile.goal.target_price)}
        error={errors.target_price?.message}
      >
        <Input id="target_price" type="number" {...register("target_price")} />
      </FieldRow>

      <FieldRow
        label="목표 시점 (YYYY-MM)"
        htmlFor="target_move_in_ym"
        error={errors.target_move_in_ym?.message}
      >
        <Input
          id="target_move_in_ym"
          placeholder="2028-07"
          {...register("target_move_in_ym")}
        />
      </FieldRow>

      <FieldRow
        label="위험 성향"
        htmlFor="risk_preference"
        error={errors.risk_preference?.message}
      >
        <select
          id="risk_preference"
          className="h-9 rounded-md border border-line bg-surface px-3 text-sm"
          {...register("risk_preference")}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {riskPreferenceLabel(option)}
            </option>
          ))}
        </select>
      </FieldRow>
    </div>
  );
}
