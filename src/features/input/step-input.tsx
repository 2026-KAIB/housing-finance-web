"use client";

import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import type { PersonaIndexEntry, PersonaProfile } from "@/lib/contracts/persona";

import { BasicFields } from "./basic-fields";
import { DesiredHomePanel } from "./desired-home-panel";
import { GoalFields } from "./goal-fields";
import { PersonaPicker } from "./persona-picker";
import { SavingsFields } from "./savings-fields";

const DESIRED_HOME_PANEL_ID = "desired-home-panel";

export function StepInput({
  personaId,
  personas,
  profile,
}: {
  personaId: string;
  personas: PersonaIndexEntry[];
  profile: PersonaProfile;
}) {
  // 폼 값이 아니라 화면 상태이므로 react-hook-form이 아닌 로컬 state로 둔다.
  const [homePanelOpen, setHomePanelOpen] = useState(false);

  return (
    <div className="grid gap-8">
      <PersonaPicker personaId={personaId} personas={personas} />

      <Group title="기본 정보">
        <BasicFields profile={profile} />
      </Group>

      <Group
        title="목표 설정"
        description="현재 페르소나의 목표 금액은 월세 보증금 시나리오로 생성된 원본 데이터 값입니다. 매매 시나리오 페르소나 4명은 현금흐름 엔진이 비어 있어 1차 범위에서 제외했습니다."
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={homePanelOpen}
            aria-controls={DESIRED_HOME_PANEL_ID}
            onClick={() => setHomePanelOpen((open) => !open)}
          >
            희망 주택
          </Button>
        }
      >
        <GoalFields profile={profile} />
        {homePanelOpen && <DesiredHomePanel id={DESIRED_HOME_PANEL_ID} />}
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
