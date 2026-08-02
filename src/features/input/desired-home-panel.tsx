"use client";

import { useFormContext } from "react-hook-form";

import { KakaoMap } from "@/components/map/kakao-map";
import { Input } from "@/components/ui/input";
import {
  ALL_DISTRICTS,
  ALL_DISTRICTS_OPTION_LABEL,
  REGION_PLACEHOLDER_LABEL,
  SEOUL_DISTRICTS,
} from "@/lib/constants/seoul-districts";
import { koreanUnitHint } from "@/lib/format/money";

import { FieldRow } from "./field-row";
import type { InputFormValues } from "./form-schema";
import { RegionTradeTable } from "./region-trade-table";

export function DesiredHomePanel({ id }: { id: string }) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<InputFormValues>();

  const targetRegion = watch("target_region");

  return (
    <div id={id} className="grid gap-4">
      {/* 목표 시점·위험 성향과 같은 2열 그리드를 한 벌 더 쓴다.
          열 너비가 정확히 일치해야 "같은 형식"이 된다. */}
      <div className="grid gap-4 md:grid-cols-2">
        <FieldRow
          label="지역"
          htmlFor="target_region"
          error={errors.target_region?.message}
        >
          <select
            id="target_region"
            className="h-9 rounded-md border border-line bg-surface px-3 text-sm"
            {...register("target_region")}
          >
            {/* 자리표시가 없으면 값이 ""일 때 <select>가 첫 옵션을 그려버려,
                고르지도 않은 "전체"가 선택된 것처럼 보인다. */}
            <option value="" disabled>
              {REGION_PLACEHOLDER_LABEL}
            </option>
            <option value={ALL_DISTRICTS}>{ALL_DISTRICTS_OPTION_LABEL}</option>
            {SEOUL_DISTRICTS.map((district) => (
              <option key={district.code} value={district.code}>
                {district.name}
              </option>
            ))}
          </select>
        </FieldRow>

        <FieldRow
          label="목표 가격 (원)"
          htmlFor="target_price"
          hint={koreanUnitHint(watch("target_price"))}
          error={errors.target_price?.message}
        >
          <Input id="target_price" type="number" {...register("target_price")} />
        </FieldRow>
      </div>

      <FieldRow
        label="전용면적 (㎡)"
        htmlFor="exclusive_area_m2"
        hint="취득세를 확정하는 데 씁니다. 85㎡ 이하면 농어촌특별세가 붙지 않습니다."
        error={errors.exclusive_area_m2?.message}
      >
        <Input
          id="exclusive_area_m2"
          type="number"
          step="0.01"
          {...register("exclusive_area_m2")}
        />
      </FieldRow>

      <RegionTradeTable
        sggCode={targetRegion ?? ""}
        onSelectPrice={(won) =>
          // shouldValidate가 없으면 값은 채워졌는데 기존 검증 오류가 남는다.
          setValue("target_price", won, { shouldValidate: true })
        }
      />

      <KakaoMap className="h-[260px] md:h-[360px]" />
    </div>
  );
}
