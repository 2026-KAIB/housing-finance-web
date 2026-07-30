# 희망 주택 지도 패널 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `step 1. 정보 입력`의 `목표 설정` 헤더에 `희망 주택` 버튼을 달고, 누르면 `지역`·`목표 가격` 토글과 카카오맵 대한민국 지도가 인라인으로 펼쳐지게 한다.

**Architecture:** 아래에서 위로 쌓는다. ① 카카오 SDK 스크립트 주입을 Promise 하나로 감싸는 로더(`src/lib/map/kakao-loader.ts`), ② 그 로더를 써서 지도를 그리고 키 미설정·로딩·성공·실패 네 상태를 명시적으로 렌더하는 `KakaoMap` 컴포넌트, ③ 토글 두 개와 지도를 조립하는 `DesiredHomePanel`, ④ `StepInput`의 `Group`에 `action` 슬롯을 열어 버튼을 붙이고 패널을 조건부 마운트. 폼(react-hook-form)에는 아무 필드도 추가하지 않는다.

**Tech Stack:** Next.js 16.2.11 (App Router) · React 19.2.8 · TypeScript 5.9 (`strict`) · Tailwind CSS v4 · Base UI(shadcn) · Vitest 4 + Testing Library(jsdom) · Kakao Maps JavaScript SDK v2

## Global Constraints

- 설계 근거 문서: `docs/superpowers/specs/2026-07-30-desired-home-map-design.md` (커밋 `fb0dc0d`)
- **폼에 새 필드를 추가하지 않는다.** `src/features/input/form-schema.ts`는 이번 계획에서 수정 대상이 아니다. 지역 값 저장·`target_price` 연동은 명시적 비범위다.
- **행정구역 폴리곤(GeoJSON), 매물 마커, 시세 표시를 만들지 않는다.** 카카오맵 기본 타일만 띄운다.
- 색상은 기존 토큰만 쓴다: `border-line`, `bg-surface`, `text-brand-muted`, `text-accent`. **hex를 하드코딩하지 않는다.**
- 브랜드 옐로(`--color-brand`)는 **채움 전용**이다. `Button variant="brand"`가 `text-brand-ink`를 함께 적용하므로 버튼에만 쓰고, `text-brand` 같은 클래스는 만들지 않는다.
- 앱 키 환경변수 이름은 정확히 `NEXT_PUBLIC_KAKAO_MAP_APP_KEY`다. 카카오맵 JS SDK가 브라우저에서 로드되므로 `NEXT_PUBLIC_` 접두사가 필수다.
- **`.env`는 커밋하지 않는다.** `.gitignore`가 `.env`와 `.env.*`를 제외하고 `.env.example`만 예외로 둔다. `git add -f .env`를 쓰지 않는다.
- UI 문구는 모두 한국어다.
- 브랜치는 현재 `feature/frontend-prototype`을 유지한다.
- 각 태스크 종료 시 `npm test`와 `npm run typecheck`가 통과해야 한다.

---

## File Structure

| 파일 | 책임 | 작업 | 태스크 |
|---|---|---|---|
| `.env` | 로컬 앱 키 (git 미추적) | 생성 | 1 |
| `.env.example` | 환경변수 템플릿 | 수정 | 1 |
| `src/lib/map/kakao-types.ts` | 프로젝트가 실제로 쓰는 SDK 표면만 담은 타입 + `Window.kakao` 전역 선언 | 생성 | 1 |
| `src/lib/map/kakao-loader.ts` | SDK 스크립트 주입, `kakao.maps.load()`를 Promise로 감쌈, 중복 로드 차단 | 생성 | 1 |
| `src/lib/map/kakao-loader.test.ts` | 로더 단위 테스트 | 생성 | 1 |
| `src/components/map/kakao-map.tsx` | 지도 인스턴스 생성 + 4상태 렌더 | 생성 | 2 |
| `src/components/map/kakao-map.test.tsx` | 지도 컴포넌트 테스트 | 생성 | 2 |
| `src/features/input/desired-home-panel.tsx` | 토글 그룹 + 지도 조립 | 생성 | 3 |
| `src/features/input/desired-home-panel.test.tsx` | 패널 테스트 | 생성 | 3 |
| `src/features/input/step-input.tsx` | `Group`에 `action` 슬롯 추가, 버튼·패널 열림 상태 소유 | 수정 | 4 |
| `src/features/input/step-input.test.tsx` | 버튼 배치·열림/닫힘 테스트 | 생성 | 4 |
| `src/features/input/input-wizard.test.tsx` | 패널이 열려 있어도 검증·이동이 정상인지 회귀 테스트 1개 추가 | 수정 | 4 |

**타입 파일이 `.d.ts`가 아닌 이유:** `tsconfig.json`이 `skipLibCheck: true`라 `.d.ts` 안의 선언은 타입 검사에서 제외된다. 일반 `.ts` 모듈이면 검사 대상이 되고 `import type`으로 명시적으로 끌어 쓸 수 있다. (스펙 §4.1도 같은 결론으로 갱신됨)

---

## Task 1: 환경변수와 카카오 SDK 로더

**Files:**
- Create: `.env`
- Modify: `.env.example`
- Create: `src/lib/map/kakao-types.ts`
- Create: `src/lib/map/kakao-loader.ts`
- Test: `src/lib/map/kakao-loader.test.ts`

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces:
  - `type KakaoLatLng`, `KakaoMapInstance`, `KakaoMapOptions`, `KakaoMapsNamespace` (from `@/lib/map/kakao-types`)
  - `loadKakaoMaps(appKey: string): Promise<KakaoMapsNamespace>` (from `@/lib/map/kakao-loader`)
  - 전역 `Window.kakao?: { maps?: KakaoMapsNamespace }`

- [ ] **Step 1: `.env`와 `.env.example`을 만든다**

`.env` (신규, 커밋하지 않는다):

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_KAKAO_MAP_APP_KEY=your_kakao_javascript_key_here
```

`.env.example` (기존 1줄 뒤에 추가):

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_KAKAO_MAP_APP_KEY=your_kakao_javascript_key_here
```

`.env`의 값은 사용자가 카카오 개발자 콘솔의 **JavaScript 키**로 직접 교체한다. 실제 렌더에는 콘솔 > 내 애플리케이션 > 플랫폼 > Web에 `http://localhost:3000` 등록도 필요하다.

- [ ] **Step 2: 실패하는 로더 테스트를 작성한다**

`src/lib/map/kakao-loader.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

import type { KakaoMapsNamespace } from "./kakao-types";

/** SDK 네임스페이스 대역. load()는 콜백을 즉시 실행한다. */
function fakeMaps(): KakaoMapsNamespace {
  return {
    LatLng: vi.fn() as unknown as KakaoMapsNamespace["LatLng"],
    Map: vi.fn() as unknown as KakaoMapsNamespace["Map"],
    load: (callback: () => void) => callback(),
  };
}

function injectedScripts(): HTMLScriptElement[] {
  return Array.from(
    document.querySelectorAll<HTMLScriptElement>(
      'script[src*="dapi.kakao.com"]',
    ),
  );
}

/**
 * 로더는 모듈 스코프에 Promise를 캐시한다. 테스트마다 모듈을 다시 평가해
 * 캐시를 비운다 — 프로덕션 코드에 테스트 전용 리셋 함수를 두지 않기 위해서다.
 */
async function importLoader() {
  vi.resetModules();
  return import("./kakao-loader");
}

afterEach(() => {
  injectedScripts().forEach((script) => script.remove());
  delete window.kakao;
});

describe("loadKakaoMaps", () => {
  it("appkey와 autoload=false를 붙인 SDK 스크립트를 주입한다", async () => {
    const { loadKakaoMaps } = await importLoader();

    void loadKakaoMaps("TEST_KEY");

    const [script] = injectedScripts();
    expect(script).toBeDefined();
    expect(script.src).toContain("appkey=TEST_KEY");
    expect(script.src).toContain("autoload=false");
  });

  it("SDK 로드가 끝나면 maps 네임스페이스로 resolve한다", async () => {
    const { loadKakaoMaps } = await importLoader();

    const promise = loadKakaoMaps("TEST_KEY");
    const maps = fakeMaps();
    window.kakao = { maps };
    injectedScripts()[0].dispatchEvent(new Event("load"));

    await expect(promise).resolves.toBe(maps);
  });

  it("여러 번 불러도 스크립트를 한 번만 주입한다", async () => {
    const { loadKakaoMaps } = await importLoader();

    const first = loadKakaoMaps("TEST_KEY");
    const second = loadKakaoMaps("TEST_KEY");

    expect(injectedScripts()).toHaveLength(1);
    expect(first).toBe(second);
  });

  it("이미 로드된 SDK가 있으면 스크립트를 주입하지 않는다", async () => {
    const maps = fakeMaps();
    window.kakao = { maps };
    const { loadKakaoMaps } = await importLoader();

    await expect(loadKakaoMaps("TEST_KEY")).resolves.toBe(maps);
    expect(injectedScripts()).toHaveLength(0);
  });

  it("로드에 실패하면 reject하고 다음 호출에서 다시 시도한다", async () => {
    const { loadKakaoMaps } = await importLoader();

    const first = loadKakaoMaps("TEST_KEY");
    injectedScripts()[0].dispatchEvent(new Event("error"));
    await expect(first).rejects.toThrow("카카오맵 SDK를 불러오지 못했습니다");

    injectedScripts().forEach((script) => script.remove());
    void loadKakaoMaps("TEST_KEY");
    expect(injectedScripts()).toHaveLength(1);
  });
});
```

- [ ] **Step 3: 테스트가 실패하는지 확인한다**

Run: `npx vitest run src/lib/map/kakao-loader.test.ts`
Expected: FAIL — `Failed to resolve import "./kakao-types"` / `"./kakao-loader"`

- [ ] **Step 4: 타입 파일을 만든다**

`src/lib/map/kakao-types.ts`:

```ts
/**
 * 카카오맵 SDK 전체 타입을 가져오지 않고, 이 프로젝트가 실제로 호출하는
 * 표면만 선언한다. 쓰지 않는 API가 늘어나면 그때 여기에 추가한다.
 */

export interface KakaoLatLng {
  getLat(): number;
  getLng(): number;
}

export interface KakaoMapOptions {
  center: KakaoLatLng;
  level: number;
}

export interface KakaoMapInstance {
  setCenter(latlng: KakaoLatLng): void;
  setLevel(level: number): void;
}

export interface KakaoMapsNamespace {
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  Map: new (
    container: HTMLElement,
    options: KakaoMapOptions,
  ) => KakaoMapInstance;
  /** autoload=false로 받은 SDK를 명시적으로 초기화한다. */
  load(callback: () => void): void;
}

declare global {
  interface Window {
    kakao?: { maps?: KakaoMapsNamespace };
  }
}
```

- [ ] **Step 5: 로더를 구현한다**

`src/lib/map/kakao-loader.ts`:

```ts
import type { KakaoMapsNamespace } from "./kakao-types";

const SDK_URL = "https://dapi.kakao.com/v2/maps/sdk.js";

/** 첫 호출의 Promise를 캐시해, 패널을 여닫아도 스크립트가 한 번만 주입되게 한다. */
let pending: Promise<KakaoMapsNamespace> | null = null;

export function loadKakaoMaps(appKey: string): Promise<KakaoMapsNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("카카오맵은 브라우저에서만 불러올 수 있습니다"),
    );
  }

  const loaded = window.kakao?.maps;
  if (loaded?.Map) return Promise.resolve(loaded);
  if (pending) return pending;

  pending = new Promise<KakaoMapsNamespace>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${SDK_URL}?appkey=${encodeURIComponent(appKey)}&autoload=false`;
    script.async = true;

    script.onload = () => {
      const maps = window.kakao?.maps;
      if (!maps) {
        reject(new Error("카카오맵 SDK를 초기화하지 못했습니다"));
        return;
      }
      // autoload=false라 SDK가 스스로 초기화하지 않는다. onload 시점에는
      // maps.Map이 아직 없을 수 있으므로 load() 콜백까지 기다린다.
      maps.load(() => resolve(maps));
    };

    script.onerror = () => {
      reject(new Error("카카오맵 SDK를 불러오지 못했습니다"));
    };

    document.head.appendChild(script);
  });

  // 실패한 Promise를 캐시에 남기면 재시도가 영영 막힌다.
  pending.catch(() => {
    pending = null;
  });

  return pending;
}
```

- [ ] **Step 6: 테스트가 통과하는지 확인한다**

Run: `npx vitest run src/lib/map/kakao-loader.test.ts`
Expected: PASS — 5 tests

- [ ] **Step 7: 타입 검사**

Run: `npm run typecheck`
Expected: 오류 없음

- [ ] **Step 8: 커밋**

`.env`는 `.gitignore` 대상이므로 스테이징하지 않는다. `git status`에 `.env`가 보이면 안 된다.

```bash
git add .env.example src/lib/map/kakao-types.ts src/lib/map/kakao-loader.ts src/lib/map/kakao-loader.test.ts
git commit -m "feat(map): 카카오맵 SDK 로더와 앱 키 환경변수 추가"
```

---

## Task 2: KakaoMap 컴포넌트

**Files:**
- Create: `src/components/map/kakao-map.tsx`
- Test: `src/components/map/kakao-map.test.tsx`

**Interfaces:**
- Consumes: `loadKakaoMaps(appKey: string): Promise<KakaoMapsNamespace>` (Task 1), `cn` (`@/lib/utils`)
- Produces:
  - `KakaoMap(props: { center?: { lat: number; lng: number }; level?: number; className?: string; ariaLabel?: string }): JSX.Element`
  - `KOREA_CENTER: { lat: 36.5; lng: 127.9 }`, `KOREA_LEVEL: 13`
  - 접근성 계약: 루트가 `<section aria-label>`이므로 테스트에서 `getByRole("region", { name: "대한민국 지도" })`로 잡는다.

- [ ] **Step 1: 실패하는 컴포넌트 테스트를 작성한다**

`src/components/map/kakao-map.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { KakaoMapsNamespace } from "@/lib/map/kakao-types";

import { KakaoMap } from "./kakao-map";

const { loadKakaoMaps } = vi.hoisted(() => ({ loadKakaoMaps: vi.fn() }));

vi.mock("@/lib/map/kakao-loader", () => ({ loadKakaoMaps }));

/** 생성자 호출을 기록하는 SDK 대역. */
function fakeMaps() {
  const LatLng = vi.fn();
  const MapCtor = vi.fn();
  const maps = {
    LatLng,
    Map: MapCtor,
    load: (callback: () => void) => callback(),
  } as unknown as KakaoMapsNamespace;
  return { maps, LatLng, MapCtor };
}

beforeEach(() => {
  loadKakaoMaps.mockReset();
  vi.stubEnv("NEXT_PUBLIC_KAKAO_MAP_APP_KEY", "TEST_KEY");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("KakaoMap", () => {
  it("앱 키가 없으면 안내 문구를 보여주고 SDK를 부르지 않는다", () => {
    vi.stubEnv("NEXT_PUBLIC_KAKAO_MAP_APP_KEY", "");

    render(<KakaoMap />);

    expect(
      screen.getByText(/NEXT_PUBLIC_KAKAO_MAP_APP_KEY/),
    ).toBeInTheDocument();
    expect(loadKakaoMaps).not.toHaveBeenCalled();
  });

  it("전국이 보이는 기본 뷰로 지도를 만든다", async () => {
    const { maps, LatLng, MapCtor } = fakeMaps();
    loadKakaoMaps.mockResolvedValue(maps);

    render(<KakaoMap />);

    await waitFor(() => expect(MapCtor).toHaveBeenCalledTimes(1));
    expect(loadKakaoMaps).toHaveBeenCalledWith("TEST_KEY");
    expect(LatLng).toHaveBeenCalledWith(36.5, 127.9);
    expect(MapCtor.mock.calls[0][1]).toMatchObject({ level: 13 });
  });

  it("지도를 만들면 로딩 문구를 지운다", async () => {
    const { maps } = fakeMaps();
    loadKakaoMaps.mockResolvedValue(maps);

    render(<KakaoMap />);

    expect(screen.getByText("지도를 불러오는 중…")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText("지도를 불러오는 중…")).not.toBeInTheDocument(),
    );
  });

  it("center와 level을 넘기면 그 값으로 지도를 만든다", async () => {
    const { maps, LatLng, MapCtor } = fakeMaps();
    loadKakaoMaps.mockResolvedValue(maps);

    render(<KakaoMap center={{ lat: 37.5665, lng: 126.978 }} level={8} />);

    await waitFor(() => expect(MapCtor).toHaveBeenCalledTimes(1));
    expect(LatLng).toHaveBeenCalledWith(37.5665, 126.978);
    expect(MapCtor.mock.calls[0][1]).toMatchObject({ level: 8 });
  });

  it("SDK 로드에 실패하면 오류 문구를 보여준다", async () => {
    loadKakaoMaps.mockRejectedValue(new Error("boom"));

    render(<KakaoMap />);

    expect(
      await screen.findByText(/지도를 불러오지 못했습니다/),
    ).toBeInTheDocument();
  });

  it("지도 영역에 접근 가능한 이름을 붙인다", () => {
    loadKakaoMaps.mockReturnValue(new Promise(() => {}));

    render(<KakaoMap />);

    expect(
      screen.getByRole("region", { name: "대한민국 지도" }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npx vitest run src/components/map/kakao-map.test.tsx`
Expected: FAIL — `Failed to resolve import "./kakao-map"`

- [ ] **Step 3: 컴포넌트를 구현한다**

`src/components/map/kakao-map.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

import { loadKakaoMaps } from "@/lib/map/kakao-loader";
import { cn } from "@/lib/utils";

/** 남한 전체가 한 화면에 들어오는 중심과 줌 레벨. */
export const KOREA_CENTER = { lat: 36.5, lng: 127.9 };
export const KOREA_LEVEL = 13;

type Status = "missing-key" | "loading" | "ready" | "error";

const MESSAGE: Record<Exclude<Status, "ready">, string> = {
  "missing-key":
    "카카오맵 API 키가 설정되지 않았습니다. .env의 NEXT_PUBLIC_KAKAO_MAP_APP_KEY를 채워주세요.",
  loading: "지도를 불러오는 중…",
  error:
    "지도를 불러오지 못했습니다. 앱 키와 카카오 개발자 콘솔의 플랫폼 도메인 등록을 확인해주세요.",
};

export function KakaoMap({
  center = KOREA_CENTER,
  level = KOREA_LEVEL,
  className,
  ariaLabel = "대한민국 지도",
}: {
  center?: { lat: number; lng: number };
  level?: number;
  className?: string;
  ariaLabel?: string;
}) {
  // 빌드 시 인라인되는 값이라 컴포넌트 안에서 읽어도 비용이 없다.
  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY ?? "";
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>(
    appKey ? "loading" : "missing-key",
  );

  useEffect(() => {
    if (!appKey) return;
    let cancelled = false;

    loadKakaoMaps(appKey)
      .then((maps) => {
        if (cancelled || !containerRef.current) return;
        new maps.Map(containerRef.current, {
          center: new maps.LatLng(center.lat, center.lng),
          level,
        });
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
    // center를 객체째 의존성에 넣으면 매 렌더마다 지도가 다시 만들어진다.
  }, [appKey, center.lat, center.lng, level]);

  return (
    <section
      aria-label={ariaLabel}
      className={cn(
        "relative overflow-hidden rounded-lg border border-line bg-surface",
        className,
      )}
    >
      {appKey && <div ref={containerRef} className="h-full w-full" />}
      {status !== "ready" && (
        <p className="absolute inset-0 m-0 grid place-items-center px-6 text-center text-sm text-brand-muted">
          {MESSAGE[status]}
        </p>
      )}
    </section>
  );
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

Run: `npx vitest run src/components/map/kakao-map.test.tsx`
Expected: PASS — 6 tests

- [ ] **Step 5: 전체 테스트와 타입 검사**

Run: `npm test && npm run typecheck`
Expected: 전부 통과

- [ ] **Step 6: 커밋**

```bash
git add src/components/map/kakao-map.tsx src/components/map/kakao-map.test.tsx
git commit -m "feat(map): 카카오맵 렌더 컴포넌트와 로딩·오류 상태 추가"
```

---

## Task 3: DesiredHomePanel

**Files:**
- Create: `src/features/input/desired-home-panel.tsx`
- Test: `src/features/input/desired-home-panel.test.tsx`

**Interfaces:**
- Consumes: `KakaoMap` (Task 2), `Button` (`@/components/ui/button`)
- Produces: `DesiredHomePanel(props: { id: string }): JSX.Element` — `id`는 `StepInput`의 버튼이 `aria-controls`로 가리키는 값이다.

- [ ] **Step 1: 실패하는 패널 테스트를 작성한다**

`src/features/input/desired-home-panel.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DesiredHomePanel } from "./desired-home-panel";

const { loadKakaoMaps } = vi.hoisted(() => ({ loadKakaoMaps: vi.fn() }));

vi.mock("@/lib/map/kakao-loader", () => ({ loadKakaoMaps }));

beforeEach(() => {
  // 영원히 pending인 Promise를 주면 지도는 로딩 상태로 멈춘다.
  // 비동기 상태 전이 없이 패널 구조만 검증하기 위한 선택이다.
  loadKakaoMaps.mockReturnValue(new Promise(() => {}));
  vi.stubEnv("NEXT_PUBLIC_KAKAO_MAP_APP_KEY", "TEST_KEY");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("DesiredHomePanel", () => {
  it("지역과 목표 가격 토글을 둔다", () => {
    render(<DesiredHomePanel id="desired-home-panel" />);

    expect(screen.getByRole("button", { name: "지역" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "목표 가격" }),
    ).toBeInTheDocument();
  });

  it("기본값은 지역이 선택된 상태다", () => {
    render(<DesiredHomePanel id="desired-home-panel" />);

    expect(screen.getByRole("button", { name: "지역" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "목표 가격" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("목표 가격을 누르면 선택이 옮겨간다", async () => {
    const user = userEvent.setup();
    render(<DesiredHomePanel id="desired-home-panel" />);

    await user.click(screen.getByRole("button", { name: "목표 가격" }));

    expect(screen.getByRole("button", { name: "목표 가격" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "지역" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("토글을 바꿔도 지도를 다시 만들지 않는다", async () => {
    const user = userEvent.setup();
    render(<DesiredHomePanel id="desired-home-panel" />);

    expect(loadKakaoMaps).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "목표 가격" }));

    expect(
      screen.getByRole("region", { name: "대한민국 지도" }),
    ).toBeInTheDocument();
    expect(loadKakaoMaps).toHaveBeenCalledTimes(1);
  });

  it("전달받은 id를 패널 컨테이너에 붙인다", () => {
    const { container } = render(<DesiredHomePanel id="desired-home-panel" />);

    expect(container.querySelector("#desired-home-panel")).not.toBeNull();
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npx vitest run src/features/input/desired-home-panel.test.tsx`
Expected: FAIL — `Failed to resolve import "./desired-home-panel"`

- [ ] **Step 3: 패널을 구현한다**

`src/features/input/desired-home-panel.tsx`:

```tsx
"use client";

import { useState } from "react";

import { KakaoMap } from "@/components/map/kakao-map";
import { Button } from "@/components/ui/button";

const TOGGLES = [
  { value: "region", label: "지역" },
  { value: "price", label: "목표 가격" },
] as const;

type ToggleValue = (typeof TOGGLES)[number]["value"];

/**
 * 지도 시각화 골격이다. 폼(react-hook-form)에 값을 쓰지 않으며, 토글 값도
 * 아직 지도에 영향을 주지 않는다 — 탭별 내용이 갈릴 때의 분기 지점이다.
 */
export function DesiredHomePanel({ id }: { id: string }) {
  const [selected, setSelected] = useState<ToggleValue>("region");

  return (
    <div
      id={id}
      className="grid gap-3 rounded-xl border border-line bg-surface/60 p-4"
    >
      <div role="group" aria-label="희망 주택 조건" className="flex gap-2">
        {TOGGLES.map((toggle) => (
          <Button
            key={toggle.value}
            type="button"
            size="sm"
            variant={selected === toggle.value ? "brand" : "outline"}
            aria-pressed={selected === toggle.value}
            onClick={() => setSelected(toggle.value)}
          >
            {toggle.label}
          </Button>
        ))}
      </div>

      {/* 두 토글이 같은 지도를 공유하므로 지도는 토글 바깥에 한 번만 둔다.
          탭 컴포넌트를 쓰면 전환마다 지도가 파괴·재생성된다. */}
      <KakaoMap className="h-[260px] md:h-[360px]" />
    </div>
  );
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

Run: `npx vitest run src/features/input/desired-home-panel.test.tsx`
Expected: PASS — 5 tests

`aria-pressed`가 DOM에 나타나지 않아 실패하면, `Button`(Base UI)이 프롭을 그대로 내려보내는지 `src/components/ui/button.tsx`에서 확인한다. 내려보내지 않으면 `Button` 대신 `className={cn(buttonVariants({ variant, size: "sm" }))}`를 적용한 네이티브 `<button>`으로 바꾼다 — `buttonVariants`는 같은 파일에서 export되어 있다.

- [ ] **Step 5: 전체 테스트와 타입 검사**

Run: `npm test && npm run typecheck`
Expected: 전부 통과

- [ ] **Step 6: 커밋**

```bash
git add src/features/input/desired-home-panel.tsx src/features/input/desired-home-panel.test.tsx
git commit -m "feat(input): 희망 주택 토글과 지도 패널 추가"
```

---

## Task 4: StepInput에 희망 주택 버튼 붙이기

**Files:**
- Modify: `src/features/input/step-input.tsx` (전체 파일 교체 — 아래 Step 3에 최종본 있음)
- Create: `src/features/input/step-input.test.tsx`
- Modify: `src/features/input/input-wizard.test.tsx` (테스트 1개 추가)

**Interfaces:**
- Consumes: `DesiredHomePanel({ id }: { id: string })` (Task 3), `Button` (`@/components/ui/button`)
- Produces: 사용자 표면 — `getByRole("button", { name: "희망 주택" })`, `aria-expanded`가 열림 상태를 나타내고 `aria-controls="desired-home-panel"`이 패널을 가리킨다.

- [ ] **Step 1: 실패하는 StepInput 테스트를 작성한다**

`src/features/input/step-input.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FormProvider, useForm } from "react-hook-form";

import type { PersonaProfile } from "@/lib/contracts/persona";
import { loadPersonaIndex, loadProfile } from "@/lib/fixtures/loader";

import { type InputFormValues, toFormValues } from "./form-schema";
import { StepInput } from "./step-input";

const { loadKakaoMaps } = vi.hoisted(() => ({ loadKakaoMaps: vi.fn() }));

vi.mock("@/lib/map/kakao-loader", () => ({ loadKakaoMaps }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const SAMPLE = "persona_e_college_student_basic";

/** StepInput의 하위 필드들이 useFormContext를 쓰므로 FormProvider가 필요하다. */
function Harness({ profile }: { profile: PersonaProfile }) {
  const form = useForm<InputFormValues>({
    defaultValues: toFormValues(profile),
  });

  return (
    <FormProvider {...form}>
      <StepInput
        personaId={SAMPLE}
        personas={loadPersonaIndex().personas}
        profile={profile}
      />
    </FormProvider>
  );
}

async function renderStep() {
  const profile = await loadProfile(SAMPLE);
  render(<Harness profile={profile} />);
}

beforeEach(() => {
  loadKakaoMaps.mockReturnValue(new Promise(() => {}));
  vi.stubEnv("NEXT_PUBLIC_KAKAO_MAP_APP_KEY", "TEST_KEY");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("StepInput 희망 주택", () => {
  it("목표 설정 옆에 희망 주택 버튼을 둔다", async () => {
    await renderStep();

    const button = screen.getByRole("button", { name: "희망 주택" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("aria-controls", "desired-home-panel");
  });

  it("처음에는 지도 패널이 닫혀 있다", async () => {
    await renderStep();

    expect(
      screen.queryByRole("region", { name: "대한민국 지도" }),
    ).not.toBeInTheDocument();
  });

  it("버튼을 누르면 토글과 지도가 나타난다", async () => {
    const user = userEvent.setup();
    await renderStep();

    await user.click(screen.getByRole("button", { name: "희망 주택" }));

    expect(screen.getByRole("button", { name: "지역" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "목표 가격" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "대한민국 지도" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "희망 주택" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("버튼을 다시 누르면 패널이 닫힌다", async () => {
    const user = userEvent.setup();
    await renderStep();

    const button = screen.getByRole("button", { name: "희망 주택" });
    await user.click(button);
    await user.click(button);

    expect(
      screen.queryByRole("region", { name: "대한민국 지도" }),
    ).not.toBeInTheDocument();
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("패널을 열어도 목표 금액 입력은 그대로다", async () => {
    const user = userEvent.setup();
    await renderStep();

    await user.click(screen.getByRole("button", { name: "희망 주택" }));

    expect(screen.getByLabelText("목표 금액 (원)")).toHaveValue(5000000);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npx vitest run src/features/input/step-input.test.tsx`
Expected: FAIL — `Unable to find an accessible element with the role "button" and name "희망 주택"`

- [ ] **Step 3: StepInput을 수정한다**

`src/features/input/step-input.tsx` 전체를 아래로 교체한다. 변경점은 세 가지다 — `Group`에 `action` 슬롯 추가, 헤더 행을 `flex justify-between`으로 변경, `목표 설정` Group에 버튼과 조건부 패널 연결.

```tsx
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
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

Run: `npx vitest run src/features/input/step-input.test.tsx`
Expected: PASS — 5 tests

- [ ] **Step 5: 위저드 회귀 테스트를 추가한다**

`src/features/input/input-wizard.test.tsx`의 `describe("InputWizard", ...)` 안, `"step 1에서는 이전 버튼이 없다"` 테스트 바로 뒤에 아래를 넣는다. 패널이 폼 검증에 끼어들지 않는지 확인한다 (설계 문서 §3.3).

```tsx
  it("희망 주택 패널을 열어도 다음 단계로 넘어간다", async () => {
    const user = userEvent.setup();
    await renderWizard();

    await user.click(screen.getByRole("button", { name: "희망 주택" }));
    await user.click(screen.getByRole("button", { name: "다음" }));

    expect(
      screen.getByRole("heading", { level: 2, name: /마이데이터/ }),
    ).toBeInTheDocument();
  });
```

- [ ] **Step 6: 위저드 테스트가 통과하는지 확인한다**

Run: `npx vitest run src/features/input/input-wizard.test.tsx`
Expected: PASS — 기존 12개 + 신규 1개

- [ ] **Step 7: 전체 검증**

Run: `npm test && npm run typecheck && npm run build`
Expected: 전부 통과. `npm run build`는 `.env`의 임시 키를 인라인할 뿐이므로 실패하지 않는다.

- [ ] **Step 8: 커밋**

```bash
git add src/features/input/step-input.tsx src/features/input/step-input.test.tsx src/features/input/input-wizard.test.tsx
git commit -m "feat(input): 목표 설정에 희망 주택 버튼과 지도 패널 연결"
```

---

## 수동 확인 (계획 완료 후)

1. `.env`의 `NEXT_PUBLIC_KAKAO_MAP_APP_KEY`에 카카오 개발자 콘솔의 **JavaScript 키**를 넣는다.
2. 같은 콘솔의 앱 > 플랫폼 > Web에 `http://localhost:3000`을 등록한다.
3. `npm run dev` 후 `http://localhost:3000/input`으로 간다.
4. `목표 설정` 우측의 `희망 주택`을 누른다 → `지역`·`목표 가격` 토글과 전국이 보이는 지도가 나타나야 한다.
5. 키를 비우고 새로고침하면 지도 자리에 안내 문구가 보여야 한다.

키가 유효한데 지도가 안 뜨면 브라우저 콘솔에서 도메인 미등록 오류(`Failed to load resource` / `appkey` 관련)를 먼저 확인한다.
