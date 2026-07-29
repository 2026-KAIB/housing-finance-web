"use client";

import { useFormContext } from "react-hook-form";

import { Input } from "@/components/ui/input";
import type { PersonaProfile } from "@/lib/contracts/persona";
import {
  liquidityPreferenceLabel,
  riskPreferenceLabel,
} from "@/lib/format/codes";
import { formatYmd } from "@/lib/format/date";
import { formatKoreanUnit } from "@/lib/format/money";

import { FieldRow, ReadonlyRow } from "./field-row";
import type { InputFormValues } from "./form-schema";

const RISK_OPTIONS = ["stability", "balanced", "aggressive"];

export function StepGoal({ profile }: { profile: PersonaProfile }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<InputFormValues>();

  const options = RISK_OPTIONS.includes(profile.goal.risk_preference)
    ? RISK_OPTIONS
    : [...RISK_OPTIONS, profile.goal.risk_preference];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="grid gap-4">
        <h3 className="text-sm font-bold text-brand-muted">목표</h3>

        <FieldRow
          label="목표 보증금 (원)"
          htmlFor="target_price"
          hint={formatKoreanUnit(profile.goal.target_price)}
          error={errors.target_price?.message}
        >
          <Input id="target_price" type="number" {...register("target_price")} />
        </FieldRow>

        <FieldRow
          label="목표 월세 (원)"
          htmlFor="target_monthly_rent"
          error={errors.target_monthly_rent?.message}
        >
          <Input
            id="target_monthly_rent"
            type="number"
            {...register("target_monthly_rent")}
          />
        </FieldRow>

        <FieldRow
          label="목표 관리비 (원)"
          htmlFor="target_management_fee"
          error={errors.target_management_fee?.message}
        >
          <Input
            id="target_management_fee"
            type="number"
            {...register("target_management_fee")}
          />
        </FieldRow>

        <FieldRow
          label="목표 시점 (YYYYMM)"
          htmlFor="target_move_in_ym"
          error={errors.target_move_in_ym?.message}
        >
          <Input
            id="target_move_in_ym"
            inputMode="numeric"
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

      <div className="grid gap-4">
        <h3 className="text-sm font-bold text-brand-muted">저축 계획</h3>

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

        <div>
          <ReadonlyRow
            label="유동성 선호"
            value={liquidityPreferenceLabel(profile.savings.liquidity_preference)}
          />
          <ReadonlyRow
            label="원금 손실 감수"
            value={profile.savings.accepts_principal_risk ? "예" : "아니오"}
          />
          <ReadonlyRow
            label="자금 필요 시점"
            value={formatYmd(profile.savings.fund_needed_date)}
          />
        </div>
      </div>
    </div>
  );
}
