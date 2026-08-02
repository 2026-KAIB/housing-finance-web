import type { InputFormValues } from "@/features/input/form-schema";

const KEY = "hf:input-handoff";

/**
 * 위저드가 입력한 값을 대시보드로 넘긴다.
 *
 * 두 페이지가 분리돼 있고 URL로 나르기에는 필드가 많다. 서버에 실행 상태를
 * 두지 않기 위해 `sessionStorage`를 쓴다 — 탭을 닫으면 사라지고, 다른
 * 사용자와 섞이지 않는다.
 *
 * 페르소나 id를 함께 저장한다. 페르소나를 바꾼 뒤 이전 사람의 입력으로
 * 계산하면 화면과 결과가 서로 다른 사람을 가리킨다.
 */
export function saveInputHandoff(
  personaId: string,
  values: InputFormValues,
): void {
  sessionStorage.setItem(KEY, JSON.stringify({ personaId, values }));
}

export function readInputHandoff(personaId: string): InputFormValues | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      personaId?: string;
      values?: InputFormValues;
    };
    if (parsed.personaId !== personaId || !parsed.values) return null;
    return parsed.values;
  } catch {
    return null;
  }
}
