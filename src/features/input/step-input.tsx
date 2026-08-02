"use client";

import type { ReactNode } from "react";

import type { PersonaIndexEntry, PersonaProfile } from "@/lib/contracts/persona";

import { BasicFields } from "./basic-fields";
import { DesiredHomePanel } from "./desired-home-panel";
import { GoalFields } from "./goal-fields";
import { LoanFields } from "./loan-fields";
import { PersonaPicker } from "./persona-picker";
import { SavingsFields } from "./savings-fields";

export function StepInput({
  personaId,
  personas,
  profile,
}: {
  personaId: string;
  personas: PersonaIndexEntry[];
  profile: PersonaProfile;
}) {
  return (
    <div className="grid gap-8">
      <PersonaPicker personaId={personaId} personas={personas} />

      <Group title="기본 정보">
        <BasicFields profile={profile} />
      </Group>

      {/* 희망 주택 입력은 접지 않는다. 접어 두면 그 안의 필드에 검증 오류가
          났을 때 [다음]이 반응하지 않는 이유가 화면 어디에도 보이지 않는다 —
          접힘을 없애면 그 결함이 원인째 사라진다. */}
      <Group
        title="목표 설정"
        description="현재 페르소나의 목표 금액은 해당 자치구의 실거래 하위 5% 값입니다. 지역과 금액은 아래에서 직접 바꿀 수 있습니다."
      >
        <GoalFields profile={profile} />
        <DesiredHomePanel />
      </Group>

      <Group
        title="대출 조건"
        description="이 세 값이 없으면 보고서의 대출 관련 절이 계산되지 않습니다."
      >
        <LoanFields />
      </Group>

      <Group title="저축 계획">
        <SavingsFields />
      </Group>
    </div>
  );
}

function Group({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <h2 className="text-lg font-bold tracking-[-0.03em]">{title}</h2>
          {description && (
            <p className="text-xs text-brand-muted">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
