# 목표 설정 재구성 구현 계획 — 지역 드롭다운과 목표 가격

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `목표 설정`에서 `목표 금액 (원)`을 빼고, `희망 주택` 패널의 토글 두 개를 실제 입력 필드(서울 25개 구 드롭다운 + 목표 가격)로 바꿔 지도 박스 바깥·`목표 시점`/`위험 성향` 아래에 같은 형식으로 놓는다. 두 필드가 채워지기 전에는 `다음`을 누를 수 없다.

**Architecture:** 아래에서 위로 쌓는다. ① 서울 25개 구 상수 모듈, ② 폼 스키마에 `target_region` 추가와 프리필 규칙, ③ UI 이동(`GoalFields` 2열화 + `DesiredHomePanel` 재작성), ④ 필수 검증과 `다음` 버튼 잠금, ⑤ 입력 확인 화면 반영. `target_price`는 **키를 유지**하므로 계약·픽스처·대시보드는 건드리지 않는다.

**Tech Stack:** Next.js 16.2.11 (App Router) · React 19.2.8 · TypeScript 5.9 (`strict`) · Tailwind CSS v4 · Base UI(shadcn) · react-hook-form 7 + zod 4 · Vitest 4 + Testing Library(jsdom)

## Global Constraints

- 설계 근거 문서: `docs/superpowers/specs/2026-07-31-goal-region-price-design.md` (커밋 `0e168c6`)
- **`target_price`의 스키마 키를 바꾸지 않는다.** 라벨과 위치만 바뀐다. `src/lib/contracts/persona.ts`, `src/mocks/fixtures/**`, `src/features/personas/persona-grid.tsx`, 대시보드는 **수정 대상이 아니다**.
- **픽스처를 수정하지 않는다.** 페르소나 지역 데이터 정리는 커밋 `0e168c6`(web) / `a14bb3c`(core)에서 이미 끝났다. 20명 전원이 서울 구 코드를 갖는다.
- 색상은 기존 토큰만 쓴다: `border-line`, `bg-surface`, `text-brand-muted`. **hex를 하드코딩하지 않는다.**
- `<select>` 요소의 클래스는 기존 것과 정확히 같다: `h-9 rounded-md border border-line bg-surface px-3 text-sm` (`goal-fields.tsx`의 위험 성향 select에서 그대로 가져온다).
- UI 문구는 모두 한국어이며, 이 계획에 적힌 문자열을 **글자 그대로** 쓴다. 테스트가 문자열에 의존한다.
- `목표 설정` Group의 `description` 문자열은 한 글자도 바꾸지 않는다.
- 행정구역 폴리곤·매물 마커·시세 표시를 만들지 않는다. **지역 선택이 지도를 움직이지 않는다.**
- DB 접속·부동산 API(설계안 §1.1의 B·C)는 이번 범위 밖이다. `.env`에 DB 관련 값을 넣지 않는다.
- 브랜치는 `feature/frontend-prototype`을 유지한다.
- 작업 트리에 기능과 무관한 기존 수정(`.gitignore` 끝 개행)이 있다. **스테이징하지도, 되돌리지도 않는다.**
- 각 태스크 종료 시 `npm test`와 `npm run typecheck`가 통과해야 한다.

---

## File Structure

| 파일 | 책임 | 작업 | 태스크 |
|---|---|---|---|
| `src/lib/constants/seoul-districts.ts` | 25개 구 데이터 + `ALL` 센티널 + 판정·라벨 함수 | 생성 | 1 |
| `src/lib/constants/seoul-districts.test.ts` | 위 모듈 단위 테스트 | 생성 | 1 |
| `src/features/input/form-schema.ts` | `target_region` 필드와 프리필 규칙 | 수정 | 2, 4 |
| `src/features/input/form-schema.test.ts` | 스키마·프리필 테스트 | 수정 | 2, 4 |
| `src/features/input/goal-fields.tsx` | `target_price` 제거, 2열화 | 수정 | 3 |
| `src/features/input/desired-home-panel.tsx` | 토글 → `FieldRow` 2개, 감싸개 제거 | 수정 | 3 |
| `src/features/input/desired-home-panel.test.tsx` | 전면 재작성 | 수정 | 3 |
| `src/features/input/step-input.tsx` | 패널에 `profile` 전달 | 수정 | 3 |
| `src/features/input/step-input.test.tsx` | 사라진 필드 참조 교체 | 수정 | 3 |
| `src/features/input/input-wizard.tsx` | `다음` 잠금 + 사유 문구 | 수정 | 4 |
| `src/features/input/input-wizard.test.tsx` | 라벨·위치 반영(3), 잠금 테스트(4) | 수정 | 3, 4 |
| `src/features/input/step-review.tsx` | `목표 가격` 라벨 + `지역` 행 | 수정 | 5 |
| `src/features/input/step-review.test.tsx` | 위 반영 | 수정 | 5 |

**태스크 2와 4가 `form-schema.ts`를 나눠 고치는 이유:** 태스크 2는 필드를 `z.string()`으로
넣기만 하고, 필수 제약(`.min(1)`)은 `다음` 버튼 잠금과 같은 요구사항이므로 태스크 4가
함께 넣는다. 태스크 2에서 곧바로 필수로 만들면 아직 그 값을 고를 UI가 없는 상태에서
위저드가 막혀 태스크 2·3의 테스트가 통과하지 못한다. 각 태스크가 초록 상태로 끝나도록
나눈 것이다.

---

## Task 1: 서울 25개 구 상수 모듈

**Files:**
- Create: `src/lib/constants/seoul-districts.ts`
- Test: `src/lib/constants/seoul-districts.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces (모두 `@/lib/constants/seoul-districts`에서 export):
  - `SEOUL_DISTRICTS: readonly { readonly code: string; readonly name: string }[]` — 25개, 코드 오름차순
  - `ALL_DISTRICTS: "ALL"`
  - `ALL_DISTRICTS_OPTION_LABEL: "전체 (서울 25개 구)"`
  - `REGION_PLACEHOLDER_LABEL: "지역을 선택하세요"`
  - `isSeoulDistrict(code: string): boolean`
  - `seoulDistrictLabel(code: string): string`

- [ ] **Step 1: 실패하는 테스트를 작성한다**

`src/lib/constants/seoul-districts.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  ALL_DISTRICTS,
  SEOUL_DISTRICTS,
  isSeoulDistrict,
  seoulDistrictLabel,
} from "./seoul-districts";

describe("SEOUL_DISTRICTS", () => {
  it("서울 자치구 25개를 담는다", () => {
    expect(SEOUL_DISTRICTS).toHaveLength(25);
  });

  it("행정표준코드 오름차순이다", () => {
    const codes = SEOUL_DISTRICTS.map((district) => district.code);
    expect(codes).toEqual([...codes].sort());
  });

  it("종로구에서 시작해 강동구로 끝난다", () => {
    expect(SEOUL_DISTRICTS[0]).toEqual({ code: "11110", name: "종로구" });
    expect(SEOUL_DISTRICTS[24]).toEqual({ code: "11740", name: "강동구" });
  });

  it("코드와 이름에 중복이 없다", () => {
    const codes = new Set(SEOUL_DISTRICTS.map((district) => district.code));
    const names = new Set(SEOUL_DISTRICTS.map((district) => district.name));
    expect(codes.size).toBe(25);
    expect(names.size).toBe(25);
  });

  it("전체 센티널은 구 목록에 들어 있지 않다", () => {
    expect(
      SEOUL_DISTRICTS.some((district) => district.code === ALL_DISTRICTS),
    ).toBe(false);
  });
});

describe("isSeoulDistrict", () => {
  it("서울 구 코드를 통과시킨다", () => {
    expect(isSeoulDistrict("11680")).toBe(true);
    expect(isSeoulDistrict("11110")).toBe(true);
  });

  it("서울 밖 코드를 거부한다", () => {
    // 픽스처 정리 전에 쓰이던 값들 — 부산·대구·광주·대전
    for (const code of ["26440", "27200", "29170", "30200", "41135"]) {
      expect(isSeoulDistrict(code), code).toBe(false);
    }
  });

  it("빈 문자열과 전체 센티널을 거부한다", () => {
    expect(isSeoulDistrict("")).toBe(false);
    expect(isSeoulDistrict(ALL_DISTRICTS)).toBe(false);
  });
});

describe("seoulDistrictLabel", () => {
  it("구 코드를 구 이름으로 바꾼다", () => {
    expect(seoulDistrictLabel("11680")).toBe("강남구");
    expect(seoulDistrictLabel("11650")).toBe("서초구");
  });

  it("전체 센티널은 요약용 문구로 바꾼다", () => {
    expect(seoulDistrictLabel(ALL_DISTRICTS)).toBe("서울 전체");
  });

  it("모르는 코드는 받은 값을 그대로 돌려준다", () => {
    expect(seoulDistrictLabel("30200")).toBe("30200");
    expect(seoulDistrictLabel("")).toBe("");
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npx vitest run src/lib/constants/seoul-districts.test.ts`
Expected: FAIL — `Failed to resolve import "./seoul-districts"`

- [ ] **Step 3: 상수 모듈을 구현한다**

`src/lib/constants/seoul-districts.ts`:

```ts
/**
 * 서울 25개 자치구. 코드는 행정표준코드이며 오름차순이 곧 표준 표기 순서다.
 * 부동산 DB(`db_schema_realestate.md`)의 `sgg_codes` 테이블과 같은 값이라,
 * 나중에 API로 갈아끼울 때 형식을 바꿀 필요가 없다.
 */
export const SEOUL_DISTRICTS: readonly {
  readonly code: string;
  readonly name: string;
}[] = [
  { code: "11110", name: "종로구" },
  { code: "11140", name: "중구" },
  { code: "11170", name: "용산구" },
  { code: "11200", name: "성동구" },
  { code: "11215", name: "광진구" },
  { code: "11230", name: "동대문구" },
  { code: "11260", name: "중랑구" },
  { code: "11290", name: "성북구" },
  { code: "11305", name: "강북구" },
  { code: "11320", name: "도봉구" },
  { code: "11350", name: "노원구" },
  { code: "11380", name: "은평구" },
  { code: "11410", name: "서대문구" },
  { code: "11440", name: "마포구" },
  { code: "11470", name: "양천구" },
  { code: "11500", name: "강서구" },
  { code: "11530", name: "구로구" },
  { code: "11545", name: "금천구" },
  { code: "11560", name: "영등포구" },
  { code: "11590", name: "동작구" },
  { code: "11620", name: "관악구" },
  { code: "11650", name: "서초구" },
  { code: "11680", name: "강남구" },
  { code: "11710", name: "송파구" },
  { code: "11740", name: "강동구" },
];

/**
 * "아직 안 골랐다"(빈 문자열)와 구분되는 "전체로 골랐다" 센티널.
 * 둘을 하나로 합치면 필수 입력 검증이 성립하지 않는다.
 */
export const ALL_DISTRICTS = "ALL";

/** 드롭다운 옵션 전용 문구. 요약 표기는 seoulDistrictLabel이 담당한다. */
export const ALL_DISTRICTS_OPTION_LABEL = "전체 (서울 25개 구)";

/** 값이 빈 문자열일 때 <select>가 무엇을 그릴지 정하는 자리표시 옵션 문구. */
export const REGION_PLACEHOLDER_LABEL = "지역을 선택하세요";

export function isSeoulDistrict(code: string): boolean {
  return SEOUL_DISTRICTS.some((district) => district.code === code);
}

/**
 * 입력 확인 화면 등 요약 표기용. 모르는 코드는 `codes.ts`의 lookup과 같은
 * 관용으로 받은 값을 그대로 돌려준다.
 */
export function seoulDistrictLabel(code: string): string {
  if (code === ALL_DISTRICTS) return "서울 전체";

  return SEOUL_DISTRICTS.find((district) => district.code === code)?.name ?? code;
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

Run: `npx vitest run src/lib/constants/seoul-districts.test.ts`
Expected: PASS — 11 tests (5 + 3 + 3)

`as const`을 쓰지 않는 이유: 리터럴 타입이 보존되면 `district.code`가 25개 코드의 유니온이
되어 테스트의 `district.code === ALL_DISTRICTS`(`"ALL"` 리터럴) 비교가 TS2367(겹치지 않는
비교)로 typecheck를 깨뜨린다. Tasks 2-5 중 리터럴 유니온이 필요한 곳은 없다.

- [ ] **Step 5: 전체 검증**

Run: `npm test && npm run typecheck`
Expected: 전부 통과 (기존 292 + 신규 11)

- [ ] **Step 6: 커밋**

```bash
git add src/lib/constants/seoul-districts.ts src/lib/constants/seoul-districts.test.ts
git commit -m "feat(input): 서울 25개 자치구 상수와 라벨 헬퍼 추가"
```

---

## Task 2: 폼 스키마에 target_region 추가

**Files:**
- Modify: `src/features/input/form-schema.ts`
- Test: `src/features/input/form-schema.test.ts`

**Interfaces:**
- Consumes: `isSeoulDistrict(code: string): boolean` (Task 1)
- Produces:
  - `InputFormValues`에 `target_region: string` 추가
  - `toFormValues(profile)`가 서울 구가 아닌 코드를 `""`로 떨어뜨린다

- [ ] **Step 1: 실패하는 테스트를 작성한다**

`src/features/input/form-schema.test.ts`의 **기존 3개 파싱 입력 객체에 `target_region`을
추가한다.** `z.string()`은 필수이므로 넣지 않으면 기존 테스트가 전부 깨진다.

1. `describe("inputFormSchema")` > `"문자열로 들어온 숫자를 숫자로 바꾼다"`의 parse 인자에
   `target_region: "11650",`를 추가한다.
2. 같은 describe > `"목표 시점이 YYYY-MM이 아니면 거부한다"`의 `base` 객체에
   `target_region: "11650",`를 추가한다.
3. `describe("금액 필드(won)")`의 `validInput` 객체에 `target_region: "11650",`를 추가한다.

그리고 파일 끝에 아래 describe를 추가한다:

```ts
describe("target_region", () => {
  const validInput = {
    age: 25,
    household_size: 3,
    monthly_income: 800000,
    monthly_average_expense: 700000,
    target_region: "11650",
    target_price: 5000000,
    target_move_in_ym: "2028-07",
    risk_preference: "stability",
    monthly_savings_budget: 100000,
    lump_sum_budget: 300000,
    emergency_reserve: 700000,
  };

  it("서울 구 코드를 통과시킨다", () => {
    expect(inputFormSchema.parse(validInput).target_region).toBe("11650");
  });

  it("전체 센티널을 통과시킨다", () => {
    expect(
      inputFormSchema.parse({ ...validInput, target_region: "ALL" })
        .target_region,
    ).toBe("ALL");
  });
});

describe("toFormValues의 지역 프리필", () => {
  it("픽스처의 서울 구 코드를 그대로 옮긴다", async () => {
    // persona_e는 커밋 0e168c6에서 30200(대전 유성) → 11650(서초구)으로 정리됐다.
    expect(toFormValues(await loadProfile(SAMPLE)).target_region).toBe("11650");
  });

  it("서울 밖 코드는 미선택으로 떨어뜨린다", async () => {
    // 픽스처에는 더 이상 서울 밖 값이 없으므로 합성 프로필로 방어 경로를 검증한다.
    const profile = await loadProfile(SAMPLE);
    const outside = {
      ...profile,
      goal: { ...profile.goal, target_region: "30200" },
    };

    expect(toFormValues(outside).target_region).toBe("");
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npx vitest run src/features/input/form-schema.test.ts`
Expected: FAIL — `target_region` 관련 단언이 `undefined`를 받아 실패한다

- [ ] **Step 3: 스키마와 프리필을 구현한다**

`src/features/input/form-schema.ts`를 두 군데 고친다.

먼저 import를 추가한다 (기존 import 블록의 `import type { PersonaProfile }` 위):

```ts
import { isSeoulDistrict } from "@/lib/constants/seoul-districts";
```

`inputFormSchema`의 `current_assets` 다음, `target_price` 앞에 한 줄 추가한다:

```ts
  // 필수 제약(.min)은 [다음] 버튼 잠금과 함께 들어온다.
  target_region: z.string(),
```

`toFormValues`의 `current_assets` 다음, `target_price` 앞에 추가한다:

```ts
    // 서울 25개 구가 아니면 미선택으로 떨어뜨린다. 검증되지 않은 코드를
    // 드롭다운 값으로 흘리는 것보다 사용자가 직접 고르게 하는 편이 안전하다.
    target_region: isSeoulDistrict(profile.goal.target_region)
      ? profile.goal.target_region
      : "",
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

Run: `npx vitest run src/features/input/form-schema.test.ts`
Expected: PASS

- [ ] **Step 5: 전체 검증**

Run: `npm test && npm run typecheck`
Expected: 전부 통과. `target_region`이 아직 화면에 없지만 필수 제약도 없으므로 위저드는 그대로 동작한다.

- [ ] **Step 6: 커밋**

```bash
git add src/features/input/form-schema.ts src/features/input/form-schema.test.ts
git commit -m "feat(input): 폼 스키마에 희망 지역 필드와 프리필 규칙 추가"
```

---

## Task 3: 필드 이동 — 2열 그리드와 드롭다운

**Files:**
- Modify: `src/features/input/goal-fields.tsx` (전체 교체)
- Modify: `src/features/input/desired-home-panel.tsx` (전체 교체)
- Modify: `src/features/input/step-input.tsx:52` 부근 (패널 호출부)
- Modify: `src/features/input/step-input.test.tsx` (테스트 1개)
- Modify: `src/features/input/input-wizard.test.tsx` (테스트 2개)
- Test: `src/features/input/desired-home-panel.test.tsx` (전체 교체)

**Interfaces:**
- Consumes: `SEOUL_DISTRICTS`, `ALL_DISTRICTS`, `ALL_DISTRICTS_OPTION_LABEL`, `REGION_PLACEHOLDER_LABEL` (Task 1); `InputFormValues.target_region` (Task 2)
- Produces:
  - `DesiredHomePanel({ id, profile }: { id: string; profile: PersonaProfile })` — **`profile` prop이 새로 필요하다** (목표 가격 힌트에 쓴다)
  - 접근성 계약: `getByLabelText("지역")`, `getByLabelText("목표 가격 (원)")`, `getByLabelText("목표 시점 (YYYY-MM)")`, `getByLabelText("위험 성향")`

- [ ] **Step 1: 실패하는 패널 테스트를 작성한다**

`src/features/input/desired-home-panel.test.tsx` 전체를 교체한다:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PersonaProfile } from "@/lib/contracts/persona";
import { loadProfile } from "@/lib/fixtures/loader";

import { DesiredHomePanel } from "./desired-home-panel";
import { type InputFormValues, toFormValues } from "./form-schema";

const { loadKakaoMaps } = vi.hoisted(() => ({ loadKakaoMaps: vi.fn() }));

vi.mock("@/lib/map/kakao-loader", () => ({ loadKakaoMaps }));

const SAMPLE = "persona_e_college_student_basic";

function Harness({ profile }: { profile: PersonaProfile }) {
  const form = useForm<InputFormValues>({
    defaultValues: toFormValues(profile),
  });

  return (
    <FormProvider {...form}>
      <DesiredHomePanel id="desired-home-panel" profile={profile} />
    </FormProvider>
  );
}

async function renderPanel() {
  const profile = await loadProfile(SAMPLE);
  render(<Harness profile={profile} />);
  return profile;
}

beforeEach(() => {
  loadKakaoMaps.mockClear();
  // 영원히 pending인 Promise를 주면 지도는 로딩 상태로 멈춘다.
  // 비동기 상태 전이 없이 패널 구조만 검증하기 위한 선택이다.
  loadKakaoMaps.mockReturnValue(new Promise(() => {}));
  vi.stubEnv("NEXT_PUBLIC_KAKAO_MAP_APP_KEY", "TEST_KEY");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("DesiredHomePanel 지역", () => {
  it("자리표시·전체·25개 구로 옵션을 구성한다", async () => {
    await renderPanel();

    const options = Array.from(
      screen.getByLabelText("지역").querySelectorAll("option"),
    );

    expect(options).toHaveLength(27);
    expect(options[0]).toHaveTextContent("지역을 선택하세요");
    expect(options[0]).toBeDisabled();
    expect(options[0]).toHaveValue("");
    expect(options[1]).toHaveTextContent("전체 (서울 25개 구)");
    expect(options[1]).toHaveValue("ALL");
    expect(options[2]).toHaveTextContent("종로구");
    expect(options[2]).toHaveValue("11110");
    expect(options[26]).toHaveTextContent("강동구");
    expect(options[26]).toHaveValue("11740");
  });

  it("프로필의 지역이 선택된 채로 시작한다", async () => {
    await renderPanel();

    // persona_e는 11650(서초구)이다.
    expect(screen.getByLabelText("지역")).toHaveValue("11650");
  });

  it("다른 구를 고를 수 있다", async () => {
    const user = userEvent.setup();
    await renderPanel();

    await user.selectOptions(screen.getByLabelText("지역"), "11680");

    expect(screen.getByLabelText("지역")).toHaveValue("11680");
  });
});

describe("DesiredHomePanel 목표 가격", () => {
  it("프로필의 목표 금액이 채워진 채로 시작한다", async () => {
    const profile = await renderPanel();

    expect(screen.getByLabelText("목표 가격 (원)")).toHaveValue(
      profile.goal.target_price,
    );
  });

  it("값을 고칠 수 있다", async () => {
    const user = userEvent.setup();
    await renderPanel();

    const input = screen.getByLabelText("목표 가격 (원)");
    await user.clear(input);
    await user.type(input, "9000000");

    expect(input).toHaveValue(9000000);
  });
});

describe("DesiredHomePanel 배치", () => {
  it("두 필드를 지도 바깥에 둔다", async () => {
    await renderPanel();

    const map = screen.getByRole("region", { name: "대한민국 지도" });

    expect(map.contains(screen.getByLabelText("지역"))).toBe(false);
    expect(map.contains(screen.getByLabelText("목표 가격 (원)"))).toBe(false);
  });

  it("지역을 바꿔도 지도를 다시 만들지 않는다", async () => {
    const user = userEvent.setup();
    await renderPanel();

    expect(loadKakaoMaps).toHaveBeenCalledTimes(1);
    await user.selectOptions(screen.getByLabelText("지역"), "11680");

    expect(
      screen.getByRole("region", { name: "대한민국 지도" }),
    ).toBeInTheDocument();
    expect(loadKakaoMaps).toHaveBeenCalledTimes(1);
  });

  it("전달받은 id를 패널 컨테이너에 붙인다", async () => {
    const profile = await loadProfile(SAMPLE);
    const { container } = render(<Harness profile={profile} />);

    expect(container.querySelector("#desired-home-panel")).not.toBeNull();
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npx vitest run src/features/input/desired-home-panel.test.tsx`
Expected: FAIL — `DesiredHomePanel`이 `profile` prop을 받지 않고 `지역` 라벨도 없다

- [ ] **Step 3: GoalFields를 2열로 줄인다**

`src/features/input/goal-fields.tsx` 전체를 아래로 교체한다. `target_price` 필드가 빠지면서
`formatKoreanUnit` import도 쓰이지 않으므로 함께 지운다.

```tsx
"use client";

import { useFormContext } from "react-hook-form";

import { Input } from "@/components/ui/input";
import type { PersonaProfile } from "@/lib/contracts/persona";
import { riskPreferenceLabel } from "@/lib/format/codes";

import { FieldRow } from "./field-row";
import type { InputFormValues } from "./form-schema";

const RISK_OPTIONS = ["stability", "balanced", "aggressive"];

export function GoalFields({ profile }: { profile: PersonaProfile }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<InputFormValues>();

  const options = RISK_OPTIONS.includes(profile.goal.risk_preference)
    ? RISK_OPTIONS
    : [...RISK_OPTIONS, profile.goal.risk_preference];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FieldRow
        label="목표 시점 (YYYY-MM)"
        htmlFor="target_move_in_ym"
        error={errors.target_move_in_ym?.message}
      >
        <Input
          id="target_move_in_ym"
          placeholder="2028-07"
          {...register("target_move_in_ym")}
        />
      </FieldRow>

      <FieldRow
        label="위험 성향"
        htmlFor="risk_preference"
        error={errors.risk_preference?.message}
      >
        <select
          id="risk_preference"
          className="h-9 rounded-md border border-line bg-surface px-3 text-sm"
          {...register("risk_preference")}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {riskPreferenceLabel(option)}
            </option>
          ))}
        </select>
      </FieldRow>
    </div>
  );
}
```

- [ ] **Step 4: DesiredHomePanel을 재작성한다**

`src/features/input/desired-home-panel.tsx` 전체를 아래로 교체한다:

```tsx
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
import type { PersonaProfile } from "@/lib/contracts/persona";
import { formatKoreanUnit } from "@/lib/format/money";

import { FieldRow } from "./field-row";
import type { InputFormValues } from "./form-schema";

export function DesiredHomePanel({
  id,
  profile,
}: {
  id: string;
  profile: PersonaProfile;
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext<InputFormValues>();

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
          hint={formatKoreanUnit(profile.goal.target_price)}
          error={errors.target_price?.message}
        >
          <Input id="target_price" type="number" {...register("target_price")} />
        </FieldRow>
      </div>

      <KakaoMap className="h-[260px] md:h-[360px]" />
    </div>
  );
}
```

- [ ] **Step 5: step-input.tsx에서 profile을 넘긴다**

`src/features/input/step-input.tsx`에서 패널 호출 한 줄을 바꾼다.

변경 전:
```tsx
        {homePanelOpen && <DesiredHomePanel id={DESIRED_HOME_PANEL_ID} />}
```
변경 후:
```tsx
        {homePanelOpen && (
          <DesiredHomePanel id={DESIRED_HOME_PANEL_ID} profile={profile} />
        )}
```

- [ ] **Step 6: 패널 테스트가 통과하는지 확인한다**

Run: `npx vitest run src/features/input/desired-home-panel.test.tsx`
Expected: PASS — 8 tests

- [ ] **Step 7: 기존 테스트 3개를 새 라벨·위치에 맞춘다**

`src/features/input/step-input.test.tsx` — `"패널을 열어도 목표 금액 입력은 그대로다"`는
대상 필드가 사라졌다. 테스트 이름과 단언을 아래로 바꾼다:

```tsx
  it("패널을 열어도 목표 시점 입력은 그대로다", async () => {
    const user = userEvent.setup();
    await renderStep();

    await user.click(screen.getByRole("button", { name: "희망 주택" }));

    expect(screen.getByLabelText("목표 시점 (YYYY-MM)")).toHaveValue("2028-07");
  });
```

`src/features/input/input-wizard.test.tsx` — 두 곳을 고친다.

(1) `"step 1에 기본정보·목표설정·저축계획이 함께 프리필된다"`에서 `목표 금액 (원)` 줄을
지운다. 이 필드는 이제 패널을 열어야 보이므로 이 테스트의 관심사가 아니다. 남는 단언은
그대로 둔다:

```tsx
  it("step 1에 기본정보·목표설정·저축계획이 함께 프리필된다", async () => {
    await renderWizard();

    expect(screen.getByLabelText("나이")).toHaveValue(25);
    expect(screen.getByLabelText("월 소득 (원)")).toHaveValue(800000);
    expect(screen.getByLabelText("월 평균 지출 (원)")).toHaveValue(700000);
    expect(screen.getByLabelText("월 저축 예산 (원)")).toHaveValue(100000);
  });
```

(2) `"값을 바꾸면 edited 표시를 붙여 이동한다"`는 목표 금액을 고치는데, 이제 그 입력이
패널 안에 있으므로 먼저 패널을 열어야 한다:

```tsx
  it("값을 바꾸면 edited 표시를 붙여 이동한다", async () => {
    const user = userEvent.setup();
    await renderWizard();

    await user.click(screen.getByRole("button", { name: "희망 주택" }));
    const target = screen.getByLabelText("목표 가격 (원)");
    await user.clear(target);
    await user.type(target, "9000000");

    await goToReview(user);
    await user.click(screen.getByRole("button", { name: "결과 보기" }));

    expect(push).toHaveBeenCalledWith(`/dashboard?persona=${SAMPLE}&edited=1`);
  });
```

- [ ] **Step 8: 전체 검증**

Run: `npm test && npm run typecheck`
Expected: 전부 통과

- [ ] **Step 9: 커밋**

```bash
git add src/features/input/goal-fields.tsx src/features/input/desired-home-panel.tsx src/features/input/desired-home-panel.test.tsx src/features/input/step-input.tsx src/features/input/step-input.test.tsx src/features/input/input-wizard.test.tsx
git commit -m "feat(input): 지역 드롭다운과 목표 가격을 지도 바깥 2열로 배치"
```

---

## Task 4: 필수 입력과 다음 버튼 잠금

**Files:**
- Modify: `src/features/input/form-schema.ts` (`target_region`에 `.min(1)` 추가)
- Modify: `src/features/input/form-schema.test.ts` (테스트 1개 추가)
- Modify: `src/features/input/input-wizard.tsx`
- Test: `src/features/input/input-wizard.test.tsx` (테스트 3개 추가)

**Interfaces:**
- Consumes: `InputFormValues.target_region` (Task 2), `getByLabelText("목표 가격 (원)")` (Task 3)
- Produces: `다음` 버튼이 `target_region`/`target_price` 중 하나라도 비면 `disabled`가 되고, 사유 문구 `희망 주택의 지역과 목표 가격을 입력해주세요.`가 함께 보인다

- [ ] **Step 1: 실패하는 테스트를 작성한다**

`src/features/input/form-schema.test.ts`의 `describe("target_region")` 안에 추가한다:

```ts
  it("빈 값을 거부한다", () => {
    const result = inputFormSchema.safeParse({
      ...validInput,
      target_region: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("지역을 선택하세요");
    }
  });
```

`src/features/input/input-wizard.test.tsx`의 `describe("InputWizard", ...)` 안,
`"step 1에서는 이전 버튼이 없다"` 바로 뒤에 추가한다:

```tsx
  it("프리필이 온전하면 다음을 바로 누를 수 있다", async () => {
    await renderWizard();

    expect(screen.getByRole("button", { name: "다음" })).toBeEnabled();
    expect(
      screen.queryByText("희망 주택의 지역과 목표 가격을 입력해주세요."),
    ).not.toBeInTheDocument();
  });

  it("목표 가격을 비우면 다음이 잠기고 사유를 알린다", async () => {
    const user = userEvent.setup();
    await renderWizard();

    await user.click(screen.getByRole("button", { name: "희망 주택" }));
    await user.clear(screen.getByLabelText("목표 가격 (원)"));

    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
    expect(
      screen.getByText("희망 주택의 지역과 목표 가격을 입력해주세요."),
    ).toBeInTheDocument();
  });

  it("목표 가격을 비운 채 패널을 닫아도 잠금과 사유가 남는다", async () => {
    const user = userEvent.setup();
    await renderWizard();

    const openPanel = screen.getByRole("button", { name: "희망 주택" });
    await user.click(openPanel);
    await user.clear(screen.getByLabelText("목표 가격 (원)"));
    await user.click(openPanel);

    // 패널을 접으면 입력은 사라지지만 react-hook-form이 값을 버리지 않으므로
    // 빈 값이 그대로 남는다. 사유 문구가 없으면 원인 모를 막다른 길이 된다.
    expect(
      screen.queryByLabelText("목표 가격 (원)"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
    expect(
      screen.getByText("희망 주택의 지역과 목표 가격을 입력해주세요."),
    ).toBeInTheDocument();
  });

  it("목표 가격을 다시 채우면 다음이 풀린다", async () => {
    const user = userEvent.setup();
    await renderWizard();

    await user.click(screen.getByRole("button", { name: "희망 주택" }));
    const target = screen.getByLabelText("목표 가격 (원)");
    await user.clear(target);
    await user.type(target, "5000000");

    expect(screen.getByRole("button", { name: "다음" })).toBeEnabled();
  });
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npx vitest run src/features/input/form-schema.test.ts src/features/input/input-wizard.test.tsx`
Expected: FAIL — 빈 값이 통과하고, 버튼은 항상 enabled이며 사유 문구가 없다

- [ ] **Step 3: 스키마를 필수로 만든다**

`src/features/input/form-schema.ts`에서 Task 2가 넣은 줄을 바꾼다.

변경 전:
```ts
  // 필수 제약(.min)은 [다음] 버튼 잠금과 함께 들어온다.
  target_region: z.string(),
```
변경 후:
```ts
  target_region: z.string().min(1, "지역을 선택하세요"),
```

- [ ] **Step 4: InputWizard에 잠금을 넣는다**

`src/features/input/input-wizard.tsx`를 세 군데 고친다.

(1) 파일 끝, `InputWizard` 함수 **뒤에** 헬퍼를 추가한다:

```tsx
/**
 * 숫자 입력을 비우면 ""가 오고 defaultValues는 number를 넣으므로 둘 다 받는다.
 * 0은 유효한 금액이므로 falsy 검사로 뭉뚱그리지 않는다.
 */
function isBlank(value: unknown): boolean {
  return value === "" || value === undefined || value === null;
}
```

(2) `const router = useRouter();` 아래(그리고 `useForm` 호출 뒤)에 구독을 추가한다.
`form` 선언 다음 줄에 놓는다:

```tsx
  // 두 필드만 구독한다. formState.isValid를 쓰면 나이·월소득 등 모든 필드로
  // 잠금 조건이 번져 기존 동작(누르면 에러 표시)이 통째로 바뀐다.
  const [targetRegion, targetPrice] = form.watch([
    "target_region",
    "target_price",
  ]);
  const goalIncomplete = isBlank(targetRegion) || isBlank(targetPrice);
  const nextBlocked = step === 0 && goalIncomplete;
```

(3) 버튼 영역을 바꾼다.

변경 전:
```tsx
            {step < STEP_TITLES.length - 1 && (
              <Button type="button" variant="brand" onClick={goNext}>
                다음
              </Button>
            )}
```
변경 후:
```tsx
            {step < STEP_TITLES.length - 1 && (
              <Button
                type="button"
                variant="brand"
                onClick={goNext}
                disabled={nextBlocked}
              >
                다음
              </Button>
            )}
            {nextBlocked && (
              <p className="self-center text-xs text-brand-muted">
                희망 주택의 지역과 목표 가격을 입력해주세요.
              </p>
            )}
```

- [ ] **Step 5: 테스트가 통과하는지 확인한다**

Run: `npx vitest run src/features/input/form-schema.test.ts src/features/input/input-wizard.test.tsx`
Expected: PASS

- [ ] **Step 6: 전체 검증**

Run: `npm test && npm run typecheck`
Expected: 전부 통과

- [ ] **Step 7: 커밋**

```bash
git add src/features/input/form-schema.ts src/features/input/form-schema.test.ts src/features/input/input-wizard.tsx src/features/input/input-wizard.test.tsx
git commit -m "feat(input): 지역·목표 가격을 필수로 만들고 다음 버튼을 잠근다"
```

---

## Task 5: 입력 확인 화면 반영

**Files:**
- Modify: `src/features/input/step-review.tsx:54-58` 부근
- Test: `src/features/input/step-review.test.tsx`

**Interfaces:**
- Consumes: `seoulDistrictLabel(code: string): string` (Task 1), `InputFormValues.target_region` (Task 2)
- Produces: 없음 (마지막 태스크)

- [ ] **Step 1: 실패하는 테스트를 작성한다**

`src/features/input/step-review.test.tsx`를 고친다.

(1) `"폼에 들어 있는 입력값을 보여준다"`에서 `목표 금액` 줄을 바꾸고 `지역`을 추가한다:

```tsx
    expect(rowValue("지역")).toBe("서초구");
    expect(rowValue("목표 가격")).toBe("5,000,000원");
```
(`목표 금액` 단언 줄은 지운다.)

(2) `"프로필이 아니라 폼의 현재 값을 보여준다"`의 단언을 바꾼다:

```tsx
    expect(rowValue("목표 가격")).toBe("9,000,000원");
```

(3) `describe("StepReview", ...)` 안에 지역 표기 테스트를 추가한다:

```tsx
  it("전체를 고르면 서울 전체로 표기한다", async () => {
    await renderReview({ overrides: { target_region: "ALL" } });

    expect(rowValue("지역")).toBe("서울 전체");
  });

  it("고른 구의 이름을 표기한다", async () => {
    await renderReview({ overrides: { target_region: "11680" } });

    expect(rowValue("지역")).toBe("강남구");
  });
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npx vitest run src/features/input/step-review.test.tsx`
Expected: FAIL — `라벨 칸을 찾을 수 없습니다: 지역` / `라벨 칸을 찾을 수 없습니다: 목표 가격`

- [ ] **Step 3: StepReview를 고친다**

`src/features/input/step-review.tsx`에서 import 한 줄을 추가한다 (`riskPreferenceLabel`
import 위):

```tsx
import { seoulDistrictLabel } from "@/lib/constants/seoul-districts";
```

그리고 오른쪽 칸의 첫 `ReadonlyRow`를 바꾼다.

변경 전:
```tsx
            <ReadonlyRow
              label="목표 금액"
              value={formatWon(values.target_price)}
            />
```
변경 후:
```tsx
            <ReadonlyRow
              label="지역"
              value={seoulDistrictLabel(values.target_region)}
            />
            <ReadonlyRow
              label="목표 가격"
              value={formatWon(values.target_price)}
            />
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

Run: `npx vitest run src/features/input/step-review.test.tsx`
Expected: PASS

- [ ] **Step 5: 전체 검증**

Run: `npm test && npm run typecheck && npm run build`
Expected: 전부 통과

- [ ] **Step 6: 커밋**

```bash
git add src/features/input/step-review.tsx src/features/input/step-review.test.tsx
git commit -m "feat(input): 입력 확인에 희망 지역을 싣고 목표 가격으로 라벨 통일"
```

---

## 수동 확인 (계획 완료 후)

1. `npm run dev` 후 `http://localhost:3000/input`으로 간다.
2. `목표 설정` 아래에 `목표 시점`·`위험 성향` **두 칸만** 있는지 본다.
3. `희망 주택`을 누른다 → 그 아래에 `지역`·`목표 가격`이 **같은 열 너비로** 나타나고,
   그 아래에 지도가 뜬다. 두 필드는 지도 테두리 **바깥**에 있어야 한다.
4. 지역 드롭다운을 연다 → `지역을 선택하세요`(회색·선택 불가), `전체 (서울 25개 구)`,
   `종로구` … `강동구` 순서인지 본다.
5. `목표 가격`을 비운다 → `다음`이 회색으로 잠기고 옆에 사유 문구가 뜬다. 다시 채우면 풀린다.
6. `다음` → `다음` → `입력 확인`에서 `지역`이 고른 구 이름으로, `목표 가격`이 금액으로 보인다.
