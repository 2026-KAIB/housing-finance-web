import { type InputFormValues, inputFormSchema } from "@/features/input/form-schema";

const KEY = "hf:input-handoff";

// inputFormSchema에 정의된 필드 이름만 가져온다. 값 자체의 타입까지
// 검사하지는 않는다 — 호출자가 어차피 inputFormSchema로 다시 검증한다.
const INPUT_FORM_KEYS = Object.keys(
  inputFormSchema.shape,
) as (keyof InputFormValues)[];

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
      values?: unknown;
    };
    if (parsed.personaId !== personaId || !hasInputFormShape(parsed.values)) {
      return null;
    }
    return parsed.values;
  } catch {
    return null;
  }
}

/**
 * JSON.parse가 성공해도 저장된 값이 InputFormValues 모양이라는 보장은 없다
 * — 이전 버전이 다른 필드 구성으로 저장했거나, 사용자가 sessionStorage를
 * 직접 건드렸을 수 있다. 필드가 하나라도 없으면 절반만 채워진 객체를 그대로
 * 돌려주지 않고 null로 떨어뜨린다. 호출자는 null을 페르소나 기본값으로
 * 대체할 수 있지만, 반쯤 채워진 객체는 대체할 수 없다 — 값이 있는 것처럼
 * 보이기 때문이다.
 */
function hasInputFormShape(value: unknown): value is InputFormValues {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return INPUT_FORM_KEYS.every((key) => key in value);
}
