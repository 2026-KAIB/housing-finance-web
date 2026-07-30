"use client";

import type { ReactNode } from "react";

import type { PersonaIndexEntry, PersonaProfile } from "@/lib/contracts/persona";

import { BasicFields } from "./basic-fields";
import { GoalFields } from "./goal-fields";
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

      <Group
        title="목표 설정"
        description="현재 페르소나의 목표 금액은 월세 보증금 시나리오로 생성된 원본 데이터 값입니다. 매매 시나리오 페르소나 4명은 현금흐름 엔진이 비어 있어 1차 범위에서 제외했습니다."
      >
        <GoalFields profile={profile} />
      </Group>

      <Group title="저축 계획">
        <SavingsFields profile={profile} />
      </Group>
    </div>
  );
}

function Group({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4">
      <div className="grid gap-1">
        <h2 className="text-lg font-bold tracking-[-0.03em]">{title}</h2>
        {description && (
          <p className="text-xs text-brand-muted">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
