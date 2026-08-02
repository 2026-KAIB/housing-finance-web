"use client";

import { useEffect, useState } from "react";

import { inputFormSchema, toFormValues } from "@/features/input/form-schema";
import { ReportViewer } from "@/features/report/report-viewer";
import { apiErrorMessage } from "@/lib/api/errors";
import { postSimulation } from "@/lib/api/client";
import { toPortfolioResult } from "@/lib/api/portfolio-result";
import { buildSimulationInput } from "@/lib/api/simulation-input";
import type { PersonaProfile } from "@/lib/contracts/persona";
import type { PortfolioResult } from "@/lib/contracts/result";
import { readInputHandoff } from "@/lib/session/input-handoff";

import { PortfolioView } from "./portfolio-view";

/** 검증에 걸린 필드 이름을 사용자가 화면에서 찾을 수 있는 라벨로 옮긴다. */
const FIELD_LABELS: Record<string, string> = {
  current_assets: "보유 자산",
  monthly_income: "월 소득",
  monthly_average_expense: "월 평균 지출",
  monthly_essential_expense: "필수 생활비",
  monthly_savings_budget: "월 저축 예산",
  lump_sum_budget: "일시 예치금",
  emergency_reserve: "비상 예비금",
  target_region: "지역",
  target_price: "목표 가격",
  target_move_in_ym: "목표 시점",
  exclusive_area_m2: "전용면적",
  months: "만기",
  housing_status: "주택 보유 상태",
};

function fieldLabel(name: string): string {
  return FIELD_LABELS[name] ?? name;
}

/**
 * 대시보드의 계산 주체.
 *
 * 두 호출은 서로를 기다리지 않는다. 카드는 AI를 부르지 않는
 * `/api/v1/simulations`로 1~2초에 뜨고, 보고서는 AI 두 번과 PDF 렌더를 거쳐
 * 나중에 붙는다. 하나로 묶으면 카드까지 20~30초를 기다린다.
 */
export function LiveDashboard({ profile }: { profile: PersonaProfile }) {
  const [result, setResult] = useState<PortfolioResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 위저드를 거치지 않고 바로 들어온 경우 페르소나 기준값으로 계산한다.
  // **반드시 검증을 거친다.** 페르소나 프로필에 없는 값이 있을 수 있고
  // (persona_e에는 current_assets가 없다), 그대로 보내면 엔진이 필수로 받는
  // liquid_assets에 undefined가 도달한다. 검증에 실패하면 API를 부르지 않고
  // **어떤 필드가 없는지 이름으로** 알린다 — "계산 불가"가 아니라 "무엇을
  // 알려주면 계산되는지"로 읽혀야 한다.
  const raw = readInputHandoff(profile.persona_id) ?? toFormValues(profile);
  const parsed = inputFormSchema.safeParse(raw);
  const values = parsed.success ? parsed.data : null;
  const input = values ? buildSimulationInput(values, profile) : null;

  useEffect(() => {
    if (input === null || values === null) return;
    let cancelled = false;

    postSimulation(input)
      .then((simulation) => {
        if (cancelled) return;
        setResult(toPortfolioResult(simulation, profile, values));
      })
      .catch((cause) => {
        if (cancelled) return;
        setError(apiErrorMessage(cause));
      });

    return () => {
      cancelled = true;
    };
    // 입력이 같으면 다시 계산하지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(input)]);

  // 검증 실패는 오류가 아니라 "덜 채워진 상태"다. 어떤 필드가 없는지 이름으로
  // 알리고 입력 화면으로 보낸다. 빈 값을 0으로 메워 계산하지 않는다.
  //
  // values 대신 input을 가드로 쓴다. 둘은 같은 조건(values ? ... : null)에서
  // 함께 만들어지므로 null 여부가 항상 같지만, TS는 별개 변수의 상관관계를
  // 추론하지 못한다. input을 직접 좁혀야 아래 ReportViewer 호출부에서
  // 단언(!) 없이 SimulationInputPayload로 좁혀진다.
  if (input === null) {
    const missing = parsed.success
      ? []
      : [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))];
    return (
      <section className="py-12">
        <p className="rounded-xl border border-line bg-accent-soft p-4 text-sm">
          이 페르소나만으로는 계산에 필요한 값이 모두 채워지지 않습니다. 입력
          화면에서 다음 값을 넣어 주세요: {missing.map(fieldLabel).join(", ")}
        </p>
        <a
          className="mt-3 inline-block text-sm font-semibold text-accent underline"
          href={`/input?persona=${profile.persona_id}`}
        >
          입력 화면으로 이동
        </a>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-12">
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </p>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="py-12">
        <p className="text-sm text-brand-muted" role="status">
          입력하신 값으로 계산하고 있습니다…
        </p>
      </section>
    );
  }

  return (
    <>
      <PortfolioView result={result} />
      <ReportViewer input={input} />
    </>
  );
}
