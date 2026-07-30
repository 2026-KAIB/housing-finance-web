# 희망 주택 지도 패널 설계안

- 작성일: 2026-07-30
- 대상 저장소: `housing-finance-web`
- 선행 문서: `2026-07-28-frontend-prototype-design.md`(위저드 구조), `2026-07-30-kb-brand-theme-design.md`(색상 토큰)
- 참조: `../../../../매물검색_통합_주택구매_금융컨설팅_전체_아키텍처.txt` §12 MVP 권장 범위

---

## 1. 배경과 범위

`step 1. 정보 입력`의 `목표 설정` 섹션에 `희망 주택` 버튼을 추가하고, 버튼을 누르면 `지역`·`목표 가격`
두 토글 버튼과 카카오맵 기반 대한민국 지도가 나타나게 한다.

이번 범위는 **지도 시각화 골격까지**다. 지도에서 지역을 고르거나 값을 폼에 저장하는 동작은
설계되지 않았으며, 이후 별도 사이클에서 다룬다.

### 1.1 명시적 비범위

아래는 이번에 구현하지 **않는다**.

- 지역 코드 선택 및 폼 저장 (`희망 지역` 필드 신설)
- 지도 위 시세·가격 표시, `target_price` 연동
- 행정구역 경계 폴리곤(GeoJSON) 오버레이
- 매물 마커·클러스터링
- 지도 상태의 다음 스텝(마이데이터·입력 확인·대시보드) 전달

향후 지역 선택을 붙일 때, 아키텍처 문서 §12가 MVP 지역 단위를 **시·군·구**로 확정해 두었으므로
그 단위를 따른다. 같은 문서가 "자유로운 지도 탐색"을 후순위로 분류했는데, 이번 패널은 탐색 기능이
아니라 시각화 골격이므로 충돌하지 않는다.

## 2. 현재 구조

| 위치 | 내용 |
|---|---|
| `src/features/input/input-wizard.tsx` | 3스텝 위저드. `step === 0`이 `StepInput` |
| `src/features/input/step-input.tsx` | `PersonaPicker` + `기본 정보`·`목표 설정`·`저축 계획` 세 `Group` |
| `src/features/input/step-input.tsx` `Group` | `title`·`description`·`children`만 받는 로컬 컴포넌트 |
| `src/features/input/goal-fields.tsx` | `target_price`·`target_move_in_ym`·`risk_preference` 3열 그리드 |
| `src/features/input/form-schema.ts` | zod 스키마 + `toFormValues`/`changedFields` |

폼 상태는 `InputWizard`의 `useForm`이 `FormProvider`로 내려준다. 지도 패널은 폼 값을 읽지도
쓰지도 않으므로 이 컨텍스트에 참여하지 않는다.

## 3. 배치와 상호작용

### 3.1 Group에 action 슬롯 추가

`step-input.tsx`의 `Group`에 `action?: ReactNode` prop을 추가하고 헤더 행을
`flex items-start justify-between gap-4`로 바꾼다. `action`을 넘기지 않는 나머지 세 Group의
렌더 결과는 변하지 않아야 한다.

```
┌ 목표 설정                          [ 희망 주택 ▾ ] ┐
│ 현재 페르소나의 목표 금액은 …                      │
│ [목표 금액] [목표 시점] [위험 성향]                │
│ ┌──────────────────────────────────────────────┐ │
│ │ ( 지역 ) ( 목표 가격 )                        │ │
│ │ ┌──────────────────────────────────────────┐ │ │
│ │ │            대한민국 지도                  │ │ │
│ │ └──────────────────────────────────────────┘ │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### 3.2 열림/닫힘

- `StepInput`이 `const [homePanelOpen, setHomePanelOpen] = useState(false)`를 소유한다.
- 버튼: `variant="outline"`, `size="sm"`, `aria-expanded={homePanelOpen}`,
  `aria-controls="desired-home-panel"`.
- 패널은 `목표 설정` Group의 `children` 안, `GoalFields` **아래**에 **조건부 마운트**한다.
  닫으면 언마운트되고, 다시 열면 지도가 새로 생성된다. CSS로 숨기지 않는 이유는 §4.4에 있다.

### 3.3 폼 검증과의 관계

`InputWizard.goNext()`가 `step === 0`에서 `form.trigger()`를 호출한다. 패널은 등록된 폼 필드를
갖지 않으므로 열려 있든 닫혀 있든 검증 결과에 영향을 주지 않는다.

## 4. 컴포넌트 설계

### 4.1 파일 구성

| 파일 | 책임 | 의존 |
|---|---|---|
| `src/lib/map/kakao-loader.ts` | SDK 스크립트 주입 + `kakao.maps.load()`를 Promise로 감쌈 | 없음 (DOM만) |
| `src/lib/map/kakao-types.ts` | 사용하는 SDK 표면만 선언한 최소 타입 + `Window.kakao` 전역 선언 | 없음 |
| `src/components/map/kakao-map.tsx` | 컨테이너 ref + 지도 인스턴스 생성, 로딩/오류 상태 렌더 | `kakao-loader` |
| `src/features/input/desired-home-panel.tsx` | 토글 그룹 + `KakaoMap` 조립 | `KakaoMap`, `Button` |

지도 컴포넌트를 `features/input`이 아니라 `components/map`에 두는 이유: 이후 매물 검색·대시보드에서도
같은 지도가 필요하고, 입력 스텝에 종속될 이유가 없다.

타입을 `.d.ts`가 아니라 일반 `.ts` 모듈로 두는 이유: `tsconfig.json`이 `skipLibCheck: true`라
`.d.ts` 안의 선언은 타입 검사에서 제외된다.

### 4.2 kakao-loader.ts

```ts
export function loadKakaoMaps(appKey: string): Promise<KakaoMaps>
```

- 모듈 스코프에 `let pending: Promise<KakaoMaps> | null`을 두고 첫 호출의 Promise를 캐시한다.
  패널을 여닫아도 스크립트는 한 번만 주입된다.
- 이미 `window.kakao?.maps`가 있으면 즉시 resolve.
- 스크립트 URL: `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`.
  `autoload=false`가 필요한 이유는 SDK가 스스로 초기화하는 시점을 제어할 수 없으면
  `script.onload` 직후 `kakao.maps.Map`이 아직 준비되지 않을 수 있기 때문이다. 로드 후
  `window.kakao.maps.load(() => resolve(window.kakao.maps))`로 명시적으로 기다린다.
- `script.onerror` → reject. 실패한 Promise는 캐시에서 비워 재시도가 가능하게 한다.

### 4.3 KakaoMap 컴포넌트

```tsx
<KakaoMap center={{ lat: 36.5, lng: 127.9 }} level={13} className="h-[260px] md:h-[360px]" />
```

- `"use client"`. `useRef<HTMLDivElement>` + `useEffect`로 마운트 후 지도를 만든다.
- 앱 키는 `process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY`에서 읽는다.
- 상태를 네 가지로 명시한다. 개발 중 "회색 빈 박스"가 원인 불명으로 보이는 상황을 막는 것이 목적이다.

| 상태 | 화면 |
|---|---|
| 키 미설정 | 안내 박스 — "카카오맵 API 키가 설정되지 않았습니다. `.env`의 `NEXT_PUBLIC_KAKAO_MAP_APP_KEY`를 채워주세요." |
| 로딩 중 | 같은 크기의 스켈레톤 박스 |
| 성공 | 지도 |
| 실패 | 오류 박스 — "지도를 불러오지 못했습니다. 앱 키와 카카오 개발자 콘솔의 플랫폼 도메인 등록을 확인해주세요." |

- 초기 뷰 `center (36.5, 127.9)` / `level 13`은 남한 전체가 한 화면에 들어오는 값이다.
  드래그·줌은 기본값대로 열어 둔다.
- 언마운트 시 컨테이너 DOM은 React가 제거한다. 카카오 SDK에 명시적 destroy API가 없으므로
  별도 정리 코드는 두지 않는다.
- 이 컴포넌트는 SSR에서 아무것도 하지 않는다(`useEffect`가 실행되지 않으므로 스켈레톤이
  서버 마크업이 된다).

### 4.4 DesiredHomePanel

- 토글 값: `useState<"region" | "price">("region")`.
- 마크업: `<div role="group" aria-label="희망 주택 조건">` 안에 `Button` 2개.
  활성 `variant="brand"`, 비활성 `variant="outline"`, 각각 `aria-pressed`.
- **탭(`components/ui/tabs.tsx`)을 쓰지 않는 이유**: base-ui `Tabs`는 패널 단위로 콘텐츠를
  마운트/언마운트한다. 두 토글이 같은 지도를 공유하는 현재 설계에서 탭을 쓰면 전환할 때마다
  지도가 파괴·재생성된다. 또한 패널 내용이 갈리지 않는 tablist는 접근성상 부정확하다.
- 지도는 토글 그룹 **아래에 한 번만** 렌더한다. 토글 값은 아직 지도에 영향을 주지 않으며,
  이후 탭별 내용이 갈릴 때의 분기 지점으로만 존재한다.
- 패널 컨테이너: `id="desired-home-panel"`, `rounded-lg border border-line p-4` (기존 토큰 사용).

## 5. 환경변수

`.env`(신규, git 추적 안 됨 — `.gitignore`가 `.env`와 `.env.*`를 이미 제외하고 `.env.example`만 예외)

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_KAKAO_MAP_APP_KEY=your_kakao_javascript_key_here
```

`.env.example`에도 `NEXT_PUBLIC_KAKAO_MAP_APP_KEY=` 항목을 같은 임시값으로 추가한다.

카카오맵 JS SDK는 브라우저에서 로드되므로 키는 반드시 `NEXT_PUBLIC_` 접두사를 가져야 한다.
실제 동작에는 카카오 개발자 콘솔의 **JavaScript 키**와, 플랫폼 > Web 사이트 도메인에
`http://localhost:3000` 등록이 필요하다. 이 값은 사용자가 직접 채운다.

## 6. 테스트

vitest + jsdom 환경에서 실제 SDK는 로드되지 않으므로 `@/lib/map/kakao-loader`를
`vi.mock`으로 대체한다.

| 파일 | 검증 |
|---|---|
| `src/features/input/step-input.test.tsx` | `목표 설정` 헤더에 `희망 주택` 버튼이 있다 / 클릭하면 패널이 열리고 `aria-expanded`가 `true`가 된다 / 다시 클릭하면 닫힌다 |
| `src/features/input/desired-home-panel.test.tsx` | `지역`·`목표 가격` 토글이 렌더된다 / 기본값은 `지역`이 `aria-pressed="true"` / `목표 가격` 클릭 시 `aria-pressed`가 뒤바뀐다 / 두 상태 모두에서 지도 컨테이너가 유지된다 |
| `src/components/map/kakao-map.test.tsx` | 키가 비어 있으면 안내 문구를 렌더하고 로더를 호출하지 않는다 / 로더 성공 시 `maps.Map`이 지정한 center·level로 호출된다 / 로더 reject 시 오류 문구를 렌더한다 |

`step-input.test.tsx`는 `FormProvider` 없이는 렌더되지 않으므로(하위 필드들이
`useFormContext`를 쓴다) 기존 `input-wizard.test.tsx`의 렌더 방식을 따른다.

## 7. 검증 명령

```
npm run typecheck
npm run test
npm run build
```

## 8. 열린 질문 (이번 범위 밖, 다음 사이클 입력)

- 지역 선택 단위와 폼 필드 이름 — 아키텍처 문서 기준 시·군·구
- `목표 가격` 토글에 실제로 무엇을 넣을지 (시세 choropleth / 가격 슬라이더 필터 / 그 외)
- 선택 결과를 `PropertySearchCriteria`로 어떻게 직렬화할지
