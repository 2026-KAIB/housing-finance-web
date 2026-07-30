"use client";

import { useRouter } from "next/navigation";

import { Label } from "@/components/ui/label";
import type { PersonaIndexEntry } from "@/lib/contracts/persona";

/**
 * 프로토타입 전용 부가 기능. 실제 사용자는 자신의 값을 직접 입력하므로,
 * 백엔드 연동 단계에서는 이 파일과 step-input.tsx의 <PersonaPicker /> 한 줄만
 * 지우면 된다. 폼 로직·검증에는 어떤 방식으로도 관여하지 않는다.
 */
export function PersonaPicker({
  personaId,
  personas,
}: {
  personaId: string;
  personas: PersonaIndexEntry[];
}) {
  const router = useRouter();

  return (
    <div className="grid gap-1.5 rounded-xl border border-dashed border-line bg-surface/60 p-4">
      <Label htmlFor="persona-picker">페르소나 선택 (프로토타입 전용)</Label>
      <select
        id="persona-picker"
        className="h-9 max-w-xs rounded-md border border-line bg-surface px-3 text-sm"
        value={personaId}
        onChange={(event) =>
          router.push(`/input?persona=${event.target.value}`)
        }
      >
        {personas.map((persona) => (
          <option key={persona.persona_id} value={persona.persona_id}>
            {persona.display_name}
          </option>
        ))}
      </select>
      <p className="text-xs text-brand-muted">
        다른 페르소나를 고르면 아래 입력값이 그 사람의 기준값으로 다시
        채워집니다. 입력 중인 값은 사라집니다.
      </p>
    </div>
  );
}
