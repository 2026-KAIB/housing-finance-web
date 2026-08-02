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
  // Node는 전역 sessionStorage를 제공하지만(kakao-loader.ts와 같은 이유로
  // 여기서도 가드가 필요하다), 그 전역은 프로세스 전체에서 공유된다 —
  // 서버에서 쓰면 다른 요청과 값이 섞일 수 있다. 서버에서는 아무것도 하지
  // 않는다.
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify({ personaId, values }));
}

export function readInputHandoff(personaId: string): InputFormValues | null {
  // 위와 같은 이유로 서버에서는 항상 null이다. null을 돌려주면 호출자는
  // 페르소나 기본값으로 대체한다 — 서버 렌더와 하이드레이션이 같은 값을
  // 보게 되어, "값이 채워지지 않았습니다"가 잠깐 보였다가 실제 값으로
  // 바뀌는 하이드레이션 불일치가 사라진다.
  if (typeof window === "undefined") return null;

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
