"use client";

import { type ReactNode, useState } from "react";
import { useFormContext } from "react-hook-form";

import { Button } from "@/components/ui/button";
import type { PersonaIndexEntry, PersonaProfile } from "@/lib/contracts/persona";

import { BasicFields } from "./basic-fields";
import { DesiredHomePanel } from "./desired-home-panel";
import type { InputFormValues } from "./form-schema";
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
  const {
    formState: { errors },
  } = useFormContext<InputFormValues>();

  // 두 필드가 접힌 패널 안에 있으므로, 검증 에러가 났는데 패널이 닫혀 있으면
  // 사용자는 [다음]이 반응하지 않는 이유를 화면 어디에서도 볼 수 없다.
  const panelOpen =
    homePanelOpen || Boolean(errors.target_region || errors.target_price);

  return (
    <div className="grid gap-8">
      <PersonaPicker personaId={personaId} personas={personas} />

      <Group title="기본 정보">
        <BasicFields profile={profile} />
      </Group>

      <Group
        title="목표 설정"
        description="현재 페르소나의 목표 금액은 해당 자치구의 실거래 하위 5% 값입니다. 지역과 금액은 [희망 주택]에서 직접 바꿀 수 있습니다."
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={panelOpen}
            aria-controls={DESIRED_HOME_PANEL_ID}
            onClick={() => setHomePanelOpen((open) => !open)}
          >
            희망 주택
          </Button>
        }
      >
        <GoalFields profile={profile} />
        {panelOpen && (
          <DesiredHomePanel id={DESIRED_HOME_PANEL_ID} />
        )}
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
