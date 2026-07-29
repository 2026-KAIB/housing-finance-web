# 프론트엔드 프로토타입 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대학생 페르소나 20명의 마이데이터와 예적금 포트폴리오 결과를 픽스처로 커밋해, 백엔드 없이도 페르소나 선택 → 입력폼 프리필 → 마이데이터 조회 → 결과 화면까지 동작하는 Next.js 프로토타입을 만든다.

**Architecture:** `housing-finance-core`의 페르소나 JSON을 Node 스크립트가 읽어 `src/mocks/fixtures/`(요약·프로필·결과)와 `public/fixtures/`(거래내역)로 정규화해 커밋한다. 화면은 zod 스키마로 픽스처를 로드 시점에 검증하고, `?persona={id}` 쿼리스트링을 단일 진실 소스로 삼는다. 백엔드 계약(`src/lib/contracts/simulation.ts`)은 수정하지 않는다.

**Tech Stack:** Next.js 16 (App Router, `--webpack`) · React 19 · TypeScript 5.9 strict · zod 4 · Tailwind CSS v4 · shadcn/ui · React Hook Form · Recharts · Vitest

**근거 스펙:** `docs/superpowers/specs/2026-07-28-frontend-prototype-design.md`

## Global Constraints

- 대상 페르소나는 **대학생 20명(`persona_e` ~ `persona_x`)뿐**이다. `persona_a`~`persona_d`는 픽스처를 생성하지도, 화면에 노출하지도 않는다. (스펙 D4)
- `housing-finance-core`는 **읽기 전용**이다. 어떤 파일도 수정·생성하지 않는다. (스펙 D2)
- `src/lib/contracts/simulation.ts`는 **수정하지 않는다**. 새 계약은 `persona.ts` / `result.ts`로 분리한다. (스펙 D6)
- core 경로는 환경변수 `MYDATA_DIR`로 받는다. 기본값 `../housing-finance-core/app/data_pipeline/mydata`.
- 계좌 분류는 `is_savings` boolean이 아니라 `account_kind` enum(`demand` | `savings` | `loan`)이다. (스펙 D8)
- 상품별 점수표·탈락사유 컴포넌트는 만들지 않는다. 엔진 출력에 데이터가 없다. (스펙 D7)
- 엔진 결과 금액·점수는 **소수 문자열**(`"2774194.2000000"`, `"85.54063388867203018409788706"`)이다. 반드시 포맷터를 거쳐 표시한다.
- 계좌번호는 화면·픽스처 어디에도 원본을 남기지 않는다. 마스킹된 값만 저장한다. (스펙 2.3)
- 커밋 전에 `npm run typecheck && npm run test`가 반드시 통과해야 한다. 앱 코드·설정·의존성이 바뀐 태스크는 `npm run build`까지 통과해야 한다 (각 태스크의 검증 단계가 어느 쪽인지 명시한다).
- 브랜치는 `feature/frontend-prototype`. 커밋 메시지 마지막 줄은 `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## File Structure

```
scripts/
  build-fixtures.mjs          진입점 — core 읽기 → 픽스처 쓰기 (I/O만)
  lib/transform.mjs           순수 변환 함수 (분류·마스킹·라벨·집계) — 테스트 대상
  lib/transform.test.mjs      위 함수의 단위 테스트
src/lib/
  format/money.ts             금액·금리·점수 포맷터
  format/date.ts              YYYYMM · YYYYMMDD 포맷터
  format/codes.ts             코드→라벨 (화면용, 스크립트와 공유하지 않음)
  contracts/persona.ts        zod — index / profile / mydata / transactions
  contracts/result.ts         zod — 포트폴리오 결과
  fixtures/loader.ts          픽스처 로드 + zod parse + 존재하지 않는 id 처리
src/features/
  personas/persona-grid.tsx   20명 카드 그리드 + 카테고리 필터
  input/input-wizard.tsx      3-step 셸 (step 상태·네비게이션)
  input/step-basic.tsx        step 1 — 프로필 폼 (RHF)
  input/step-mydata.tsx       step 2 — 마이데이터 탭 4종
  input/step-goal.tsx         step 3 — 목표·저축예산 폼 (RHF)
  input/form-schema.ts        RHF용 zod 스키마 + 기본값 변환
  mydata/account-list.tsx     계좌 탭 · 예적금 탭 (account_kind로 필터)
  mydata/loan-list.tsx        대출 탭
  mydata/transaction-panel.tsx 거래내역 탭 — 클라이언트 지연 로드
  mydata/monthly-flow-chart.tsx 월별 입출금 차트 (Recharts)
  dashboard/portfolio-view.tsx  portfolio_status 3분기 진입점
  dashboard/portfolio-summary.tsx COMPLETE — 요약 카드
  dashboard/allocation-table.tsx  COMPLETE — 배분표 + 도넛
  dashboard/portfolio-status-notice.tsx INFEASIBLE / NO_ALLOCATION_REQUIRED
src/mocks/fixtures/           커밋되는 산출물 (index.json + 20개 디렉터리)
public/fixtures/{id}/transactions.json  거래내역 (지연 로드용 정적 파일)
```

**스펙과의 차이 1건:** 스펙 §4.3은 `transactions.json`을 `src/mocks/fixtures/` 아래에 두지만, 실측 결과 20명 합계 1.8MB(1인당 약 90KB, 304~470건)라 서버 컴포넌트 페이로드에 실으면 안 된다. `public/fixtures/`에 두고 탭을 열 때 클라이언트가 `fetch`한다. 백엔드 없이 동작한다는 제약은 그대로 지킨다(Next가 정적 파일로 서빙).

---

### Task 1: 포맷터와 테스트 러너

**Files:**
- Create: `vitest.config.ts`
- Create: `src/lib/format/money.ts`, `src/lib/format/money.test.ts`
- Create: `src/lib/format/date.ts`, `src/lib/format/date.test.ts`
- Modify: `package.json` (scripts에 `test` 추가, devDependencies에 vitest)

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces:
  - `toNumber(value: string | number): number`
  - `formatWon(value: string | number): string` — `"2,774,194원"`
  - `formatKoreanUnit(value: string | number): string` — `"4억 5,000만원"`, `"277만 4,194원"`
  - `formatRate(value: number): string` — `"연 2.1%"`
  - `formatScore(value: string | number): string` — `"85.54"`
  - `formatYm(ym: string): string` — `"2026년 7월"`
  - `formatYmShort(ym: string): string` — `"26.07"` (차트 축)
  - `formatYmd(ymd: string): string` — `"2026.08.20"`

- [ ] **Step 1: Vitest 설치**

```bash
npm i -D vitest
```

- [ ] **Step 2: `vitest.config.ts` 작성**

```ts
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.mjs"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

- [ ] **Step 3: `package.json`에 test 스크립트 추가**

`"scripts"` 안에 두 줄을 추가한다 (`typecheck` 아래).

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 4: `src/lib/format/money.test.ts` — 실패하는 테스트 작성**

```ts
import { describe, expect, it } from "vitest";

import {
  formatKoreanUnit,
  formatRate,
  formatScore,
  formatWon,
  toNumber,
} from "./money";

describe("toNumber", () => {
  it("엔진이 주는 소수 문자열을 숫자로 바꾼다", () => {
    expect(toNumber("2774194.2000000")).toBeCloseTo(2774194.2, 5);
  });

  it("숫자는 그대로 통과시킨다", () => {
    expect(toNumber(1000)).toBe(1000);
  });

  it("숫자가 아니면 던진다", () => {
    expect(() => toNumber("N/A")).toThrow("숫자로 변환할 수 없는 값: N/A");
  });
});

describe("formatWon", () => {
  it("소수를 반올림하고 천단위 구분자를 넣는다", () => {
    expect(formatWon("2774194.2000000")).toBe("2,774,194원");
  });

  it("0원을 표시한다", () => {
    expect(formatWon(0)).toBe("0원");
  });
});

describe("formatKoreanUnit", () => {
  it("억·만·원 단위를 모두 표시한다", () => {
    expect(formatKoreanUnit(450000000)).toBe("4억 5,000만원");
    expect(formatKoreanUnit("2774194.2000000")).toBe("277만 4,194원");
    expect(formatKoreanUnit(12400000)).toBe("1,240만원");
    expect(formatKoreanUnit(800000)).toBe("80만원");
    expect(formatKoreanUnit(3683)).toBe("3,683원");
  });

  it("0은 0원이다", () => {
    expect(formatKoreanUnit(0)).toBe("0원");
  });

  it("음수는 부호를 앞에 붙인다", () => {
    expect(formatKoreanUnit(-700000)).toBe("-70만원");
  });
});

describe("formatRate", () => {
  it("소수 금리를 연이율 퍼센트로 바꾼다", () => {
    expect(formatRate(0.021)).toBe("연 2.1%");
    expect(formatRate(0.001)).toBe("연 0.1%");
    expect(formatRate(0.034)).toBe("연 3.4%");
    expect(formatRate(0)).toBe("연 0%");
  });
});

describe("formatScore", () => {
  it("긴 소수 점수를 두 자리로 줄인다", () => {
    expect(formatScore("85.54063388867203018409788706")).toBe("85.54");
  });
});
```

- [ ] **Step 5: 테스트가 실패하는지 확인**

Run: `npx vitest run src/lib/format/money.test.ts`
Expected: FAIL — `Failed to resolve import "./money"`

- [ ] **Step 6: `src/lib/format/money.ts` 구현**

```ts
export function toNumber(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`숫자로 변환할 수 없는 값: ${value}`);
  }

  return parsed;
}

export function formatWon(value: string | number): string {
  return `${Math.round(toNumber(value)).toLocaleString("ko-KR")}원`;
}

export function formatKoreanUnit(value: string | number): string {
  const rounded = Math.round(toNumber(value));
  const sign = rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded);

  const eok = Math.floor(abs / 100_000_000);
  const man = Math.floor((abs % 100_000_000) / 10_000);
  const won = abs % 10_000;

  const parts: string[] = [];
  if (eok > 0) parts.push(`${eok.toLocaleString("ko-KR")}억`);
  if (man > 0) parts.push(`${man.toLocaleString("ko-KR")}만`);
  if (won > 0) parts.push(won.toLocaleString("ko-KR"));

  if (parts.length === 0) {
    return "0원";
  }

  return `${sign}${parts.join(" ")}원`;
}

export function formatRate(value: number): string {
  const percent = Math.round(value * 10_000) / 100;
  return `연 ${percent}%`;
}

export function formatScore(value: string | number): string {
  return (Math.round(toNumber(value) * 100) / 100).toFixed(2);
}
```

- [ ] **Step 7: 테스트 통과 확인**

Run: `npx vitest run src/lib/format/money.test.ts`
Expected: PASS (16 assertions)

- [ ] **Step 8: `src/lib/format/date.test.ts` — 실패하는 테스트 작성**

```ts
import { describe, expect, it } from "vitest";

import { formatYm, formatYmShort, formatYmd } from "./date";

describe("formatYm", () => {
  it("YYYYMM을 한글로 바꾼다", () => {
    expect(formatYm("202607")).toBe("2026년 7월");
    expect(formatYm("202512")).toBe("2025년 12월");
  });

  it("6자리가 아니면 던진다", () => {
    expect(() => formatYm("2026")).toThrow("YYYYMM 형식이 아닙니다: 2026");
  });
});

describe("formatYmShort", () => {
  it("차트 축용 짧은 형식으로 바꾼다", () => {
    expect(formatYmShort("202607")).toBe("26.07");
  });
});

describe("formatYmd", () => {
  it("YYYYMMDD를 점 구분으로 바꾼다", () => {
    expect(formatYmd("20260820")).toBe("2026.08.20");
  });

  it("8자리가 아니면 던진다", () => {
    expect(() => formatYmd("202608")).toThrow(
      "YYYYMMDD 형식이 아닙니다: 202608",
    );
  });
});
```

- [ ] **Step 9: 테스트가 실패하는지 확인**

Run: `npx vitest run src/lib/format/date.test.ts`
Expected: FAIL — `Failed to resolve import "./date"`

- [ ] **Step 10: `src/lib/format/date.ts` 구현**

```ts
export function formatYm(ym: string): string {
  if (!/^\d{6}$/.test(ym)) {
    throw new Error(`YYYYMM 형식이 아닙니다: ${ym}`);
  }

  return `${ym.slice(0, 4)}년 ${Number(ym.slice(4, 6))}월`;
}

export function formatYmShort(ym: string): string {
  if (!/^\d{6}$/.test(ym)) {
    throw new Error(`YYYYMM 형식이 아닙니다: ${ym}`);
  }

  return `${ym.slice(2, 4)}.${ym.slice(4, 6)}`;
}

export function formatYmd(ymd: string): string {
  if (!/^\d{8}$/.test(ymd)) {
    throw new Error(`YYYYMMDD 형식이 아닙니다: ${ymd}`);
  }

  return `${ymd.slice(0, 4)}.${ymd.slice(4, 6)}.${ymd.slice(6, 8)}`;
}
```

- [ ] **Step 11: 전체 테스트와 타입체크 통과 확인**

Run: `npm run typecheck && npm run test && npm run build`
Expected: 세 명령 모두 PASS. 테스트 파일 2개, 실패 0.

- [ ] **Step 12: 커밋**

```bash
git add vitest.config.ts package.json package-lock.json src/lib/format
git commit -m "$(cat <<'EOF'
feat(format): add money and date formatters with vitest

엔진 결과가 소수 7자리 문자열로 오므로 화면에 그대로 노출되지 않도록
포맷터를 먼저 세운다. 테스트 러너도 함께 도입한다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Tailwind v4 도입과 기존 화면 포팅

기존 `globals.css` 185줄은 `.hero` `.card` `.button` 같은 전역 클래스로 되어 있다. Tailwind를 그 위에 얹으면 이후 모든 화면이 두 체계를 섞어 쓰게 되므로, 도입 시점에 기존 3개 컴포넌트를 유틸리티 클래스로 옮기고 전역 클래스를 제거한다.

**Files:**
- Create: `postcss.config.mjs`
- Modify: `src/app/globals.css` (전면 교체 — 185줄 → 약 30줄)
- Modify: `src/components/layout/app-shell.tsx`
- Modify: `src/components/ui/placeholder-page.tsx`
- Modify: `src/app/page.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: 없음
- Produces: Tailwind 테마 토큰 — `bg-background` · `bg-surface` · `text-text` · `text-muted` · `border-line` · `bg-accent` · `text-accent` · `bg-accent-soft` 유틸리티가 전 화면에서 사용 가능해진다.

- [ ] **Step 1: Tailwind v4 설치**

```bash
npm i -D tailwindcss @tailwindcss/postcss
```

- [ ] **Step 2: `postcss.config.mjs` 작성**

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

- [ ] **Step 3: `src/app/globals.css` 전면 교체**

기존 185줄을 아래 내용으로 완전히 덮어쓴다. 전역 클래스(`.shell` `.header` `.hero` `.card` `.button` `.grid` `.placeholder` `.nav` `.brand` `.eyebrow` `.actions`)는 전부 삭제하고 Step 5~7에서 유틸리티로 옮긴다.

```css
@import "tailwindcss";

@theme {
  --color-background: #f5f7f3;
  --color-surface: #ffffff;
  --color-text: #17211b;
  --color-muted: #617068;
  --color-line: #dce4de;
  --color-accent: #256b46;
  --color-accent-soft: #e1f2e8;
}

:root {
  color-scheme: light;
}

body {
  margin: 0;
  color: var(--color-text);
  background:
    radial-gradient(
      circle at top right,
      rgba(37, 107, 70, 0.12),
      transparent 28rem
    ),
    var(--color-background);
  font-family: Arial, Helvetica, sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}
```

- [ ] **Step 4: 빌드가 통과하고 토큰이 CSS에 들어갔는지 확인**

```bash
npm run build && grep -rl "256b46" .next/static/css
```

Expected: 빌드 성공, `grep`이 CSS 파일 경로를 최소 1개 출력. (이 시점의 화면은 스타일이 깨져 있다 — Step 5~7에서 복구한다.)

- [ ] **Step 5: `src/components/layout/app-shell.tsx` 포팅**

내비게이션도 함께 정리한다. `/input`·`/dashboard`는 `?persona=` 없이 들어가면 Task 7의 가드가 `/personas`로 되돌리므로, 진입점을 `/personas` 하나로 둔다.

```tsx
import Link from "next/link";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[min(1120px,calc(100%-40px))]">
      <header className="flex min-h-[72px] flex-col items-start justify-center gap-2.5 border-b border-line md:flex-row md:items-center md:justify-between md:gap-0">
        <Link className="font-extrabold tracking-[-0.04em]" href="/">
          HOME PLAN
        </Link>
        <nav
          className="flex gap-5 pb-4 text-sm text-muted md:pb-0"
          aria-label="주요 메뉴"
        >
          <Link href="/personas">페르소나 선택</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
```

- [ ] **Step 6: `src/components/ui/placeholder-page.tsx` 포팅**

```tsx
type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PlaceholderPage({
  eyebrow,
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <main className="py-18">
      <p className="m-0 font-bold text-accent">{eyebrow}</p>
      <h1 className="mb-4 text-[clamp(36px,6vw,64px)] tracking-[-0.05em]">
        {title}
      </h1>
      <p className="max-w-[680px] leading-relaxed text-muted">{description}</p>
    </main>
  );
}
```

- [ ] **Step 7: `src/app/page.tsx` 포팅**

CTA 목적지를 `/personas`로 바꾸고, 소개 문구를 1차 범위(대학생 예적금)에 맞춘다.

```tsx
import Link from "next/link";

const services = [
  {
    step: "01",
    title: "페르소나 선택",
    description: "대학생 20명 중 한 명을 골라 마이데이터를 불러옵니다.",
  },
  {
    step: "02",
    title: "정보 확인",
    description: "계좌·예적금·대출·거래내역과 목표 보증금을 확인합니다.",
  },
  {
    step: "03",
    title: "예적금 포트폴리오",
    description: "목표 시점까지의 예적금 배분 결과를 확인합니다.",
  },
];

export default function HomePage() {
  return (
    <main>
      <section className="grid gap-6 pt-24 pb-16">
        <p className="m-0 font-bold text-accent">
          HOUSING FINANCE CONSULTING
        </p>
        <h1 className="m-0 max-w-[760px] text-[clamp(40px,7vw,72px)] leading-[1.05] tracking-[-0.06em]">
          내 금융 흐름으로 계산하는 보증금 마련 로드맵
        </h1>
        <p className="m-0 max-w-[680px] text-lg leading-[1.7] text-muted">
          단순한 금리 비교가 아니라 비상자금, 저축여력, 목표 시점을 함께
          계산합니다.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-accent bg-accent px-5 font-bold text-white"
            href="/personas"
          >
            페르소나 선택하기
          </Link>
        </div>
      </section>

      <section
        className="grid grid-cols-1 gap-4 pb-20 md:grid-cols-3"
        aria-label="서비스 흐름"
      >
        {services.map((service) => (
          <article
            className="min-h-[180px] rounded-[18px] border border-line bg-surface/90 p-6"
            key={service.step}
          >
            <span className="text-[13px] font-extrabold text-accent">
              {service.step}
            </span>
            <h2 className="mt-9 mb-2.5 text-[22px] tracking-[-0.03em]">
              {service.title}
            </h2>
            <p className="m-0 leading-relaxed text-muted">
              {service.description}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
```

- [ ] **Step 8: 남은 전역 클래스 참조가 없는지 확인**

```bash
grep -rnE 'className="(shell|header|hero|card|button|grid|placeholder|nav|brand|eyebrow|actions)' src/
```

Expected: 출력 없음 (exit code 1).

- [ ] **Step 9: 빌드·타입체크·테스트 통과 확인 후 눈으로 검증**

```bash
npm run typecheck && npm run test && npm run build
```

Expected: 모두 PASS.

이어서 `npm run dev`로 `http://localhost:3000`을 열어 히어로 제목·초록 버튼·카드 3장이 이전과 같은 모양으로 보이는지 확인한다. 확인 후 dev 서버를 종료한다.

- [ ] **Step 10: 커밋**

```bash
git add package.json package-lock.json postcss.config.mjs src/app/globals.css src/app/page.tsx src/components
git commit -m "$(cat <<'EOF'
feat(style): adopt tailwind v4 and port existing screens

전역 CSS 클래스와 Tailwind가 공존하면 이후 화면이 두 체계를 섞게 되므로
도입 시점에 기존 3개 컴포넌트를 유틸리티로 옮기고 전역 클래스를 제거한다.
기존 색상 변수는 @theme 토큰으로 이관했다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: shadcn/ui 컴포넌트 도입

**Files:**
- Create: `components.json` (CLI가 생성)
- Create: `src/lib/utils.ts` (CLI가 생성 — `cn()`)
- Create: `src/components/ui/{button,card,table,tabs,badge,input,label}.tsx` (CLI가 생성)
- Modify: `src/app/globals.css` (CLI가 자기 변수를 추가하면 Task 2 토큰과 병합)

**Interfaces:**
- Consumes: Task 2의 Tailwind 설정
- Produces: `Button` · `Card`/`CardHeader`/`CardTitle`/`CardContent` · `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell` · `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` · `Badge` · `Input` · `Label` · `cn(...)`

- [ ] **Step 1: shadcn 초기화**

```bash
npx shadcn@latest init -d -y
```

Expected: `components.json`과 `src/lib/utils.ts`가 생성된다.

**CLI가 실패하면** (Tailwind v4 + Next 16 조합 미지원 등) 다음으로 대체한다.

```bash
npm i class-variance-authority clsx tailwind-merge lucide-react
```

`components.json`을 직접 작성한다.

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

`src/lib/utils.ts`를 직접 작성한다.

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: 필요한 컴포넌트 7종 추가**

```bash
npx shadcn@latest add button card table tabs badge input label -y
```

Expected: `src/components/ui/` 아래에 7개 파일이 생긴다.

- [ ] **Step 3: `globals.css`의 Task 2 토큰이 살아있는지 확인**

CLI가 `globals.css`에 자기 변수(`--background`, `--foreground` 등)를 추가하면서 Task 2의 `@theme` 블록을 지웠을 수 있다. 파일을 열어 `--color-accent: #256b46;`이 포함된 `@theme` 블록이 그대로 있는지 확인하고, 없으면 CLI가 추가한 내용 **아래에** 다시 넣는다.

```bash
grep -c "color-accent" src/app/globals.css
```

Expected: `1` 이상.

- [ ] **Step 4: 스모크 테스트 작성 — 실패 확인**

`src/components/ui/ui.smoke.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("shadcn 설치 확인", () => {
  it("cn 유틸이 클래스를 병합한다", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("필요한 컴포넌트 7종을 불러올 수 있다", async () => {
    const modules = await Promise.all([
      import("./button"),
      import("./card"),
      import("./table"),
      import("./tabs"),
      import("./badge"),
      import("./input"),
      import("./label"),
    ]);

    expect(modules[0].Button).toBeTypeOf("function");
    expect(modules[1].Card).toBeTypeOf("function");
    expect(modules[2].Table).toBeTypeOf("function");
    expect(modules[3].Tabs).toBeDefined();
    expect(modules[4].Badge).toBeTypeOf("function");
    expect(modules[5].Input).toBeTypeOf("function");
    expect(modules[6].Label).toBeDefined();
  });
});
```

Run: `npx vitest run src/components/ui/ui.smoke.test.ts`
Expected: Step 1~2가 성공했다면 이 시점에 PASS한다. FAIL이면 어느 컴포넌트가 없는지 메시지로 드러나므로 Step 2를 다시 실행한다.

- [ ] **Step 5: 전체 검증**

```bash
npm run typecheck && npm run test && npm run build
```

Expected: 모두 PASS.

- [ ] **Step 6: 커밋**

```bash
git add components.json package.json package-lock.json src/lib/utils.ts src/components/ui src/app/globals.css
git commit -m "$(cat <<'EOF'
feat(ui): add shadcn components for tables, tabs and cards

계좌·예적금·대출·거래내역 탭과 배분표에 필요한 컴포넌트 7종을 도입한다.
직접 구현하지 않는 것은 설계안 3.1 권장안을 따른 것이다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: zod 계약 정의

픽스처가 계약을 어기면 화면이 아니라 **로드 시점에** 실패해야 한다. 스크립트를 쓰기 전에 계약을 먼저 확정한다.

**Files:**
- Create: `src/lib/contracts/persona.ts`, `src/lib/contracts/persona.test.ts`
- Create: `src/lib/contracts/result.ts`, `src/lib/contracts/result.test.ts`
- 건드리지 않음: `src/lib/contracts/simulation.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `persona.ts` — `personaIndexSchema` · `personaProfileSchema` · `mydataSchema` · `transactionsSchema` · `accountKindSchema` · `personaCategorySchema` · `portfolioStatusSchema` · `sourceSchema`, 그리고 동명의 `PersonaIndex` · `PersonaIndexEntry` · `PersonaProfile` · `Mydata` · `MydataAccount` · `MydataLoan` · `MonthlySummary` · `Transactions` · `Transaction` 타입
  - `result.ts` — `portfolioResultSchema` · `allocationSchema`, `PortfolioResult` · `Allocation` 타입

- [ ] **Step 1: `src/lib/contracts/persona.test.ts` — 실패하는 테스트 작성**

```ts
import { describe, expect, it } from "vitest";

import {
  mydataSchema,
  personaIndexSchema,
  personaProfileSchema,
  transactionsSchema,
} from "./persona";

const source = { generator: "generate_all.py", as_of: "2026-07-24" };

describe("personaIndexSchema", () => {
  const valid = {
    as_of: "20260728",
    personas: [
      {
        persona_id: "persona_e_college_student_basic",
        display_name: "대학생1(기본형)",
        category: "basic",
        headline: {
          age: 25,
          monthly_income: 800000,
          monthly_expense: 700000,
          target_price: 5000000,
          target_move_in_ym: "202807",
        },
        portfolio_status: "COMPLETE",
      },
    ],
  };

  it("정상 목록을 통과시킨다", () => {
    expect(personaIndexSchema.parse(valid).personas).toHaveLength(1);
  });

  it("모르는 portfolio_status를 거부한다", () => {
    const invalid = structuredClone(valid);
    invalid.personas[0].portfolio_status = "PARTIAL";
    expect(() => personaIndexSchema.parse(invalid)).toThrow();
  });

  it("target_move_in_ym이 YYYYMM이 아니면 거부한다", () => {
    const invalid = structuredClone(valid);
    invalid.personas[0].headline.target_move_in_ym = "2028-07";
    expect(() => personaIndexSchema.parse(invalid)).toThrow();
  });
});

describe("personaProfileSchema", () => {
  const valid = {
    persona_id: "persona_e_college_student_basic",
    display_name: "대학생1(기본형)",
    category: "basic",
    basic: {
      birth_date: "20010315",
      age: 25,
      education_status: "university_student",
      military_service_status: "completed",
      employment_type: "part_time",
      marital_status: "single",
      household_size: 3,
      lives_with_parents: true,
      tuition_payer: "parents",
      current_housing_type: "living_with_parents",
    },
    goal: {
      target_housing_type: "monthly_rent",
      target_region: "30200",
      target_price: 5000000,
      target_lease_deposit: 5000000,
      target_monthly_rent: 200000,
      target_management_fee: 50000,
      target_move_in_ym: "202807",
      risk_preference: "stability",
    },
    finance: {
      annual_income_verified: 9600000,
      monthly_income: 800000,
      monthly_average_expense: 700000,
    },
    savings: {
      fund_needed_date: "20280728",
      monthly_savings_budget: 100000,
      lump_sum_budget: 300000,
      emergency_reserve: 700000,
      liquidity_preference: "high",
      accepts_principal_risk: false,
      maximum_recommended_products: 2,
    },
    source,
  };

  it("current_assets 없이도 통과시킨다 (persona_e는 이 필드가 없다)", () => {
    expect(personaProfileSchema.parse(valid).finance.current_assets).toBeUndefined();
  });

  it("current_assets가 있으면 받아들인다", () => {
    const withAssets = structuredClone(valid);
    withAssets.finance.current_assets = 1000000;
    withAssets.finance.monthly_debt_payment = 0;
    expect(personaProfileSchema.parse(withAssets).finance.current_assets).toBe(1000000);
  });

  it("필수 필드가 빠지면 거부한다", () => {
    const invalid = structuredClone(valid);
    delete invalid.savings.monthly_savings_budget;
    expect(() => personaProfileSchema.parse(invalid)).toThrow();
  });
});

describe("mydataSchema", () => {
  const valid = {
    persona_id: "persona_e_college_student_basic",
    as_of: "20260724",
    accounts: [
      {
        account_num_masked: "4010-**-**0001",
        prod_name: "KB국민 대학생 생활통장",
        account_type: "1001",
        account_type_label: "수시입출금",
        account_kind: "demand",
        saving_method: "01",
        saving_method_label: "자유입출금",
        balance_amt: 1000000,
        withdrawable_amt: 1000000,
        offered_rate: 0.001,
        issue_date: "20240102",
        has_transactions: true,
      },
    ],
    loans: [],
    monthly_summary: [
      { ym: "202607", income: 800000, expense: 700000, interest: 3360, net: 100000 },
    ],
    totals: {
      account_count: 1,
      loan_count: 0,
      total_balance: 1000000,
      total_loan_balance: 0,
    },
    derived_by: "fixture-script",
    source,
  };

  it("정상 마이데이터를 통과시킨다", () => {
    expect(mydataSchema.parse(valid).accounts[0].account_kind).toBe("demand");
  });

  it("계좌번호가 마스킹되지 않으면 거부한다", () => {
    const invalid = structuredClone(valid);
    invalid.accounts[0].account_num_masked = "40100102000001";
    expect(() => mydataSchema.parse(invalid)).toThrow();
  });

  it("account_kind가 loan이면 accounts에 들어올 수 없다", () => {
    const invalid = structuredClone(valid);
    invalid.accounts[0].account_kind = "loan";
    expect(() => mydataSchema.parse(invalid)).toThrow();
  });

  it("derived_by 플래그가 없으면 거부한다", () => {
    const invalid = structuredClone(valid);
    delete invalid.derived_by;
    expect(() => mydataSchema.parse(invalid)).toThrow();
  });
});

describe("transactionsSchema", () => {
  it("계좌번호를 키로 하는 거래 묶음을 통과시킨다", () => {
    const parsed = transactionsSchema.parse({
      persona_id: "persona_e_college_student_basic",
      accounts: {
        "4010-**-**0001": {
          trans_list: [
            {
              trans_dtime: "20260723194656",
              trans_no: "00000304",
              trans_type: "02",
              trans_type_label: "출금",
              trans_class: "체크카드",
              trans_amt: 25500,
              balance_amt: 1000000,
              trans_memo: "서점",
            },
          ],
        },
      },
      source,
    });

    expect(parsed.accounts["4010-**-**0001"].trans_list).toHaveLength(1);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/lib/contracts/persona.test.ts`
Expected: FAIL — `Failed to resolve import "./persona"`

- [ ] **Step 3: `src/lib/contracts/persona.ts` 구현**

```ts
import { z } from "zod";

const YMD = /^\d{8}$/;
const YM = /^\d{6}$/;
const MASKED_ACCOUNT = /^\d{4}-\*\*-\*\*\d{4}$/;

export const sourceSchema = z.object({
  generator: z.string(),
  as_of: z.string(),
});

export const personaCategorySchema = z.enum(["basic", "affluent", "poor"]);

export const portfolioStatusSchema = z.enum([
  "COMPLETE",
  "INFEASIBLE",
  "NO_ALLOCATION_REQUIRED",
]);

export const accountKindSchema = z.enum(["demand", "savings", "loan"]);

export const personaIndexEntrySchema = z.object({
  persona_id: z.string().min(1),
  display_name: z.string().min(1),
  category: personaCategorySchema,
  headline: z.object({
    age: z.number().int(),
    monthly_income: z.number(),
    monthly_expense: z.number(),
    target_price: z.number(),
    target_move_in_ym: z.string().regex(YM),
  }),
  portfolio_status: portfolioStatusSchema,
});

export const personaIndexSchema = z.object({
  as_of: z.string(),
  personas: z.array(personaIndexEntrySchema),
});

export const personaProfileSchema = z.object({
  persona_id: z.string().min(1),
  display_name: z.string().min(1),
  category: personaCategorySchema,
  basic: z.object({
    birth_date: z.string().regex(YMD),
    age: z.number().int(),
    education_status: z.string(),
    military_service_status: z.string(),
    employment_type: z.string(),
    marital_status: z.string(),
    household_size: z.number().int(),
    lives_with_parents: z.boolean(),
    tuition_payer: z.string(),
    current_housing_type: z.string(),
  }),
  goal: z.object({
    target_housing_type: z.string(),
    target_region: z.string(),
    target_price: z.number(),
    target_lease_deposit: z.number(),
    target_monthly_rent: z.number(),
    target_management_fee: z.number(),
    target_move_in_ym: z.string().regex(YM),
    risk_preference: z.string(),
  }),
  finance: z.object({
    annual_income_verified: z.number(),
    monthly_income: z.number(),
    monthly_average_expense: z.number(),
    current_assets: z.number().optional(),
    monthly_debt_payment: z.number().optional(),
  }),
  savings: z.object({
    fund_needed_date: z.string().regex(YMD),
    monthly_savings_budget: z.number(),
    lump_sum_budget: z.number(),
    emergency_reserve: z.number(),
    liquidity_preference: z.string(),
    accepts_principal_risk: z.boolean(),
    maximum_recommended_products: z.number().int(),
  }),
  source: sourceSchema,
});

export const mydataAccountSchema = z.object({
  account_num_masked: z.string().regex(MASKED_ACCOUNT),
  prod_name: z.string(),
  account_type: z.string(),
  account_type_label: z.string(),
  account_kind: z.enum(["demand", "savings"]),
  saving_method: z.string(),
  saving_method_label: z.string(),
  balance_amt: z.number(),
  withdrawable_amt: z.number(),
  offered_rate: z.number(),
  issue_date: z.string().regex(YMD),
  exp_date: z.string().regex(YMD).optional(),
  commit_amt: z.number().optional(),
  monthly_paid_in_amt: z.number().optional(),
  last_paid_in_cnt: z.number().int().optional(),
  has_transactions: z.boolean(),
});

export const mydataLoanSchema = z.object({
  account_num_masked: z.string().regex(MASKED_ACCOUNT),
  prod_name: z.string(),
  account_type: z.string(),
  account_type_label: z.string(),
  balance_amt: z.number(),
  loan_principal: z.number(),
  last_offered_rate: z.number(),
  repay_method: z.string(),
  repay_method_label: z.string(),
  issue_date: z.string().regex(YMD),
  exp_date: z.string().regex(YMD),
  next_repay_date: z.string().regex(YMD),
});

export const monthlySummarySchema = z.object({
  ym: z.string().regex(YM),
  income: z.number(),
  expense: z.number(),
  interest: z.number(),
  net: z.number(),
});

export const mydataSchema = z.object({
  persona_id: z.string().min(1),
  as_of: z.string().regex(YMD),
  accounts: z.array(mydataAccountSchema),
  loans: z.array(mydataLoanSchema),
  monthly_summary: z.array(monthlySummarySchema),
  totals: z.object({
    account_count: z.number().int(),
    loan_count: z.number().int(),
    total_balance: z.number(),
    total_loan_balance: z.number(),
  }),
  derived_by: z.literal("fixture-script"),
  source: sourceSchema,
});

export const transactionSchema = z.object({
  trans_dtime: z.string().regex(/^\d{14}$/),
  trans_no: z.string(),
  trans_type: z.string(),
  trans_type_label: z.string(),
  trans_class: z.string(),
  trans_amt: z.number(),
  balance_amt: z.number(),
  trans_memo: z.string(),
});

export const transactionsSchema = z.object({
  persona_id: z.string().min(1),
  accounts: z.record(
    z.string(),
    z.object({ trans_list: z.array(transactionSchema) }),
  ),
  source: sourceSchema,
});

export type PersonaIndex = z.infer<typeof personaIndexSchema>;
export type PersonaIndexEntry = z.infer<typeof personaIndexEntrySchema>;
export type PersonaProfile = z.infer<typeof personaProfileSchema>;
export type PersonaCategory = z.infer<typeof personaCategorySchema>;
export type PortfolioStatus = z.infer<typeof portfolioStatusSchema>;
export type Mydata = z.infer<typeof mydataSchema>;
export type MydataAccount = z.infer<typeof mydataAccountSchema>;
export type MydataLoan = z.infer<typeof mydataLoanSchema>;
export type MonthlySummary = z.infer<typeof monthlySummarySchema>;
export type Transactions = z.infer<typeof transactionsSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/contracts/persona.test.ts`
Expected: PASS (12 tests)

- [ ] **Step 5: `src/lib/contracts/result.test.ts` — 실패하는 테스트 작성**

```ts
import { describe, expect, it } from "vitest";

import { portfolioResultSchema } from "./result";

const base = {
  persona_id: "persona_e_college_student_basic",
  display_name: "대학생1(기본형)",
  category: "basic",
  status: "COMPLETE",
  success: true,
  coverage_ratio: "1",
  monthly_allocated: "100000",
  monthly_unallocated: "0",
  lump_sum_allocated: "300000",
  lump_sum_unallocated: "0",
  expected_total_principal: "2700000",
  expected_maturity_amount: "2774194.2000000",
  expected_net_interest: "74194.2000000",
  final_policy_status: "PASS",
  final_policy_valid: true,
  reasons: [],
  validation_reasons: [],
  allocations: [
    {
      product_name: "KB 국민프리미엄적금",
      product_kind: "installment_savings",
      allocation_amount: "100000",
      term_months: 24,
      maturity_date: "2028-07-28",
      expected_maturity_amount: "2462265.6000000",
      expected_net_interest: "62265.6000000",
      product_score: "85.54063388867203018409788706",
    },
  ],
  input: {
    age: 25,
    monthly_income: 800000,
    monthly_expense: 700000,
    current_assets: 1000000,
    monthly_savings_budget: 100000,
    lump_sum_budget: 300000,
    fund_needed_date: "20280728",
  },
  evaluation: { ELIGIBLE: 29, INELIGIBLE: 11 },
  source: { generator: "college_student_portfolio_results.json", as_of: "2026-07-28" },
};

describe("portfolioResultSchema", () => {
  it("COMPLETE 결과를 통과시킨다", () => {
    expect(portfolioResultSchema.parse(base).allocations).toHaveLength(1);
  });

  it("INFEASIBLE + 배분 0건 + UNKNOWN 정책을 통과시킨다", () => {
    const infeasible = {
      ...structuredClone(base),
      status: "INFEASIBLE",
      success: false,
      final_policy_status: "UNKNOWN",
      final_policy_valid: false,
      allocations: [],
      reasons: ["상품 최소 납입액, 예산 또는 예금자보호 제약을 만족하는 조합이 없습니다."],
    };

    const parsed = portfolioResultSchema.parse(infeasible);
    expect(parsed.allocations).toHaveLength(0);
    expect(parsed.reasons[0]).toContain("예금자보호");
  });

  it("금액을 숫자로 넣으면 거부한다 (엔진은 문자열로 준다)", () => {
    const invalid = structuredClone(base);
    invalid.expected_maturity_amount = 2774194.2 as unknown as string;
    expect(() => portfolioResultSchema.parse(invalid)).toThrow();
  });

  it("모르는 정책 상태를 거부한다", () => {
    const invalid = structuredClone(base);
    invalid.final_policy_status = "PENDING";
    expect(() => portfolioResultSchema.parse(invalid)).toThrow();
  });
});
```

- [ ] **Step 6: 테스트가 실패하는지 확인**

Run: `npx vitest run src/lib/contracts/result.test.ts`
Expected: FAIL — `Failed to resolve import "./result"`

- [ ] **Step 7: `src/lib/contracts/result.ts` 구현**

```ts
import { z } from "zod";

import {
  personaCategorySchema,
  portfolioStatusSchema,
  sourceSchema,
} from "./persona";

export const allocationSchema = z.object({
  product_name: z.string(),
  product_kind: z.string(),
  allocation_amount: z.string(),
  term_months: z.number().int(),
  maturity_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expected_maturity_amount: z.string(),
  expected_net_interest: z.string(),
  product_score: z.string(),
});

export const portfolioResultSchema = z.object({
  persona_id: z.string().min(1),
  display_name: z.string().min(1),
  category: personaCategorySchema,
  status: portfolioStatusSchema,
  success: z.boolean(),
  coverage_ratio: z.string(),
  monthly_allocated: z.string(),
  monthly_unallocated: z.string(),
  lump_sum_allocated: z.string(),
  lump_sum_unallocated: z.string(),
  expected_total_principal: z.string(),
  expected_maturity_amount: z.string(),
  expected_net_interest: z.string(),
  final_policy_status: z.enum(["PASS", "FAIL", "UNKNOWN"]),
  final_policy_valid: z.boolean(),
  reasons: z.array(z.string()),
  validation_reasons: z.array(z.string()),
  allocations: z.array(allocationSchema),
  input: z.object({
    age: z.number().int(),
    monthly_income: z.number(),
    monthly_expense: z.number(),
    current_assets: z.number(),
    monthly_savings_budget: z.number(),
    lump_sum_budget: z.number(),
    fund_needed_date: z.string().regex(/^\d{8}$/),
  }),
  evaluation: z.object({
    ELIGIBLE: z.number().int(),
    INELIGIBLE: z.number().int(),
  }),
  source: sourceSchema,
});

export type Allocation = z.infer<typeof allocationSchema>;
export type PortfolioResult = z.infer<typeof portfolioResultSchema>;
```

- [ ] **Step 8: 전체 검증**

```bash
npm run typecheck && npm run test
```

Expected: 모두 PASS. 이 태스크는 앱 코드를 건드리지 않으므로 `build`는 필요 없다. `simulation.ts`는 변경되지 않았다 — `git diff --name-only`에 나타나면 안 된다.

- [ ] **Step 9: 커밋**

```bash
git add src/lib/contracts/persona.ts src/lib/contracts/persona.test.ts src/lib/contracts/result.ts src/lib/contracts/result.test.ts
git commit -m "$(cat <<'EOF'
feat(contracts): add persona and portfolio result schemas

픽스처가 계약을 어기면 화면이 아니라 로드 시점에 실패하도록
zod 스키마를 먼저 확정한다. 백엔드 미러인 simulation.ts는 건드리지 않고
프론트 소유 네임스페이스로 분리했다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: 픽스처 변환 함수 (순수 로직)

파일 I/O가 섞이면 테스트가 core 저장소에 의존하게 된다. 변환 로직만 별도 모듈로 분리해 인라인 데이터로 테스트한다.

**Files:**
- Create: `scripts/lib/transform.mjs`, `scripts/lib/transform.test.mjs`

**Interfaces:**
- Consumes: 없음
- Produces (모두 `scripts/lib/transform.mjs`에서 named export):
  - `maskAccountNum(accountNum: string): string`
  - `accountKind(accountType: string): "demand" | "savings" | "loan"`
  - `accountTypeLabel(accountType: string): string`
  - `savingMethodLabel(code: string): string`
  - `repayMethodLabel(code: string): string`
  - `transTypeLabel(code: string): string`
  - `buildMonthlySummary(transList: object[]): {ym,income,expense,interest,net}[]`
  - `categoryOf(personaId: string): "basic" | "affluent" | "poor"`

- [ ] **Step 1: `scripts/lib/transform.test.mjs` — 실패하는 테스트 작성**

```js
import { describe, expect, it } from "vitest";

import {
  accountKind,
  accountTypeLabel,
  buildMonthlySummary,
  categoryOf,
  maskAccountNum,
  repayMethodLabel,
  savingMethodLabel,
  transTypeLabel,
} from "./transform.mjs";

describe("maskAccountNum", () => {
  it("앞 4자리와 뒤 4자리만 남긴다", () => {
    expect(maskAccountNum("40100102000001")).toBe("4010-**-**0001");
    expect(maskAccountNum("41500102000004")).toBe("4150-**-**0004");
  });

  it("8자리 미만이면 던진다", () => {
    expect(() => maskAccountNum("1234567")).toThrow(
      "계좌번호가 너무 짧습니다: 1234567",
    );
  });
});

describe("accountKind", () => {
  it("수시입출금은 demand다", () => {
    expect(accountKind("1001")).toBe("demand");
  });

  it("정기예금과 적금은 savings다", () => {
    expect(accountKind("1002")).toBe("savings");
    expect(accountKind("1003")).toBe("savings");
  });

  it("3000번대는 loan이다", () => {
    expect(accountKind("3150")).toBe("loan");
    expect(accountKind("3100")).toBe("loan");
  });

  it("청약과 ISA는 1차 범위 밖이므로 던진다", () => {
    expect(() => accountKind("1999")).toThrow("지원하지 않는 계좌 유형: 1999");
    expect(() => accountKind("2003")).toThrow("지원하지 않는 계좌 유형: 2003");
  });
});

describe("accountTypeLabel", () => {
  it("코드를 한글 라벨로 바꾼다", () => {
    expect(accountTypeLabel("1001")).toBe("수시입출금");
    expect(accountTypeLabel("1002")).toBe("정기예금");
    expect(accountTypeLabel("1003")).toBe("적금");
    expect(accountTypeLabel("3150")).toBe("학자금대출");
  });

  it("모르는 코드는 던진다", () => {
    expect(() => accountTypeLabel("9999")).toThrow(
      "지원하지 않는 계좌 유형: 9999",
    );
  });
});

describe("savingMethodLabel / repayMethodLabel / transTypeLabel", () => {
  it("적립 방식 코드를 바꾼다", () => {
    expect(savingMethodLabel("01")).toBe("자유입출금");
    expect(savingMethodLabel("03")).toBe("정액적립식");
  });

  it("상환 방식 04는 원리금균등분할상환이다", () => {
    expect(repayMethodLabel("01")).toBe("만기일시상환");
    expect(repayMethodLabel("04")).toBe("원리금균등분할상환");
  });

  it("거래 구분 코드를 바꾼다", () => {
    expect(transTypeLabel("02")).toBe("출금");
    expect(transTypeLabel("03")).toBe("입금");
    expect(transTypeLabel("98")).toBe("기타(입금)");
  });
});

describe("buildMonthlySummary", () => {
  const transList = [
    { trans_dtime: "20260710120000", trans_type: "03", trans_amt: 800000 },
    { trans_dtime: "20260712120000", trans_type: "02", trans_amt: 500000 },
    { trans_dtime: "20260715120000", trans_type: "02", trans_amt: 200000 },
    { trans_dtime: "20260716120000", trans_type: "98", trans_amt: 3360 },
    { trans_dtime: "20260812120000", trans_type: "02", trans_amt: 700000 },
    { trans_dtime: "20260801120000", trans_type: "01", trans_amt: 999999 },
  ];

  it("월별로 입금·출금·이자를 나눠 합산한다", () => {
    expect(buildMonthlySummary(transList)[0]).toEqual({
      ym: "202607",
      income: 800000,
      expense: 700000,
      interest: 3360,
      net: 100000,
    });
  });

  it("소득이 없는 달도 income 0으로 남긴다", () => {
    expect(buildMonthlySummary(transList)[1]).toEqual({
      ym: "202608",
      income: 0,
      expense: 700000,
      interest: 0,
      net: -700000,
    });
  });

  it("신규(01)는 합계에서 제외한다", () => {
    const total = buildMonthlySummary(transList).reduce(
      (sum, row) => sum + row.income + row.expense + row.interest,
      0,
    );
    expect(total).toBe(800000 + 700000 + 3360 + 700000);
  });

  it("월 오름차순으로 정렬한다", () => {
    expect(buildMonthlySummary(transList).map((row) => row.ym)).toEqual([
      "202607",
      "202608",
    ]);
  });

  it("빈 거래는 빈 배열이다", () => {
    expect(buildMonthlySummary([])).toEqual([]);
  });
});

describe("categoryOf", () => {
  it("페르소나 id 접미사에서 카테고리를 뽑는다", () => {
    expect(categoryOf("persona_e_college_student_basic")).toBe("basic");
    expect(categoryOf("persona_l_college_student_08_affluent")).toBe("affluent");
    expect(categoryOf("persona_x_college_student_20_poor")).toBe("poor");
  });

  it("모르는 접미사는 던진다", () => {
    expect(() => categoryOf("persona_a_social_starter")).toThrow(
      "카테고리를 알 수 없는 페르소나: persona_a_social_starter",
    );
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run scripts/lib/transform.test.mjs`
Expected: FAIL — `Failed to load ./transform.mjs`

- [ ] **Step 3: `scripts/lib/transform.mjs` 구현**

```js
const ACCOUNT_TYPE_LABELS = {
  "1001": "수시입출금",
  "1002": "정기예금",
  "1003": "적금",
  "3150": "학자금대출",
};

const SAVING_METHOD_LABELS = {
  "01": "자유입출금",
  "02": "거치식",
  "03": "정액적립식",
  "04": "자유적립식",
};

const REPAY_METHOD_LABELS = {
  "01": "만기일시상환",
  "02": "원금균등분할상환",
  "03": "거치식-원금균등",
  "04": "원리금균등분할상환",
  "05": "거치식-원리금균등",
  "06": "만기지정-원금균등",
  "07": "만기지정-원리금균등",
  "08": "한도거래",
  "09": "기타(직접산정)",
};

const TRANS_TYPE_LABELS = {
  "01": "신규",
  "02": "출금",
  "03": "입금",
  "98": "기타(입금)",
};

export function maskAccountNum(accountNum) {
  if (typeof accountNum !== "string" || accountNum.length < 8) {
    throw new Error(`계좌번호가 너무 짧습니다: ${accountNum}`);
  }

  return `${accountNum.slice(0, 4)}-**-**${accountNum.slice(-4)}`;
}

export function accountKind(accountType) {
  if (accountType === "1001") return "demand";
  if (accountType === "1002" || accountType === "1003") return "savings";
  if (accountType.startsWith("3")) return "loan";

  throw new Error(`지원하지 않는 계좌 유형: ${accountType}`);
}

export function accountTypeLabel(accountType) {
  const label = ACCOUNT_TYPE_LABELS[accountType];

  if (!label) {
    throw new Error(`지원하지 않는 계좌 유형: ${accountType}`);
  }

  return label;
}

export function savingMethodLabel(code) {
  const label = SAVING_METHOD_LABELS[code];

  if (!label) {
    throw new Error(`지원하지 않는 적립 방식: ${code}`);
  }

  return label;
}

export function repayMethodLabel(code) {
  const label = REPAY_METHOD_LABELS[code];

  if (!label) {
    throw new Error(`지원하지 않는 상환 방식: ${code}`);
  }

  return label;
}

export function transTypeLabel(code) {
  const label = TRANS_TYPE_LABELS[code];

  if (!label) {
    throw new Error(`지원하지 않는 거래 구분: ${code}`);
  }

  return label;
}

export function buildMonthlySummary(transList) {
  const byMonth = new Map();

  for (const trans of transList) {
    const ym = trans.trans_dtime.slice(0, 6);

    if (!byMonth.has(ym)) {
      byMonth.set(ym, { ym, income: 0, expense: 0, interest: 0, net: 0 });
    }

    const row = byMonth.get(ym);

    if (trans.trans_type === "03") row.income += trans.trans_amt;
    else if (trans.trans_type === "02") row.expense += trans.trans_amt;
    else if (trans.trans_type === "98") row.interest += trans.trans_amt;
  }

  return [...byMonth.values()]
    .map((row) => ({ ...row, net: row.income - row.expense }))
    .sort((a, b) => a.ym.localeCompare(b.ym));
}

export function categoryOf(personaId) {
  for (const category of ["basic", "affluent", "poor"]) {
    if (personaId.endsWith(`_${category}`)) return category;
  }

  throw new Error(`카테고리를 알 수 없는 페르소나: ${personaId}`);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run scripts/lib/transform.test.mjs`
Expected: PASS (17 tests)

- [ ] **Step 5: 전체 검증**

```bash
npm run typecheck && npm run test
```

Expected: 두 명령 모두 PASS. 이 태스크는 앱 코드를 건드리지 않으므로 `build`는 필요 없다.

- [ ] **Step 6: 커밋**

```bash
git add scripts/lib/transform.mjs scripts/lib/transform.test.mjs
git commit -m "$(cat <<'EOF'
feat(fixtures): add pure transform helpers for persona data

계좌 분류·마스킹·라벨·월별 집계를 I/O와 분리해 인라인 데이터로 테스트한다.
1차 범위 밖 계좌 유형(1999 청약·2003 ISA)은 조용히 넘기지 않고 던지게 해서
데이터가 바뀌면 스크립트가 즉시 실패하도록 했다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 픽스처 생성 스크립트와 산출물 커밋

**Files:**
- Create: `scripts/build-fixtures.mjs`
- Create: `src/mocks/fixtures.test.ts` (생성된 픽스처를 계약으로 검증)
- Create (스크립트 산출물): `src/mocks/fixtures/index.json`, `src/mocks/fixtures/{persona_id}/{profile,mydata,result}.json` (20개), `public/fixtures/{persona_id}/transactions.json` (20개)
- Modify: `package.json` (`build:fixtures` 스크립트)

**Interfaces:**
- Consumes: Task 4의 zod 스키마, Task 5의 변환 함수
- Produces: 커밋된 픽스처 파일. 이후 모든 화면 태스크가 이것만 읽는다.

- [ ] **Step 1: `package.json`에 스크립트 추가**

`"scripts"`에 한 줄을 추가한다.

```json
    "build:fixtures": "node scripts/build-fixtures.mjs"
```

- [ ] **Step 2: `src/mocks/fixtures.test.ts` — 실패하는 테스트 작성**

```ts
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  mydataSchema,
  personaIndexSchema,
  personaProfileSchema,
  transactionsSchema,
} from "@/lib/contracts/persona";
import { portfolioResultSchema } from "@/lib/contracts/result";

const FIXTURE_DIR = join(process.cwd(), "src/mocks/fixtures");
const PUBLIC_DIR = join(process.cwd(), "public/fixtures");

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

const index = personaIndexSchema.parse(readJson(join(FIXTURE_DIR, "index.json")));

describe("픽스처 목록", () => {
  it("대학생 20명이 있다", () => {
    expect(index.personas).toHaveLength(20);
  });

  it("주택구매 페르소나(a~d)는 들어있지 않다", () => {
    const ids = index.personas.map((p) => p.persona_id);
    expect(ids.some((id) => /^persona_[abcd]_/.test(id))).toBe(false);
  });

  it("포트폴리오 상태 분포가 실제 엔진 결과와 같다", () => {
    const counts = index.personas.reduce<Record<string, number>>(
      (acc, persona) => {
        acc[persona.portfolio_status] = (acc[persona.portfolio_status] ?? 0) + 1;
        return acc;
      },
      {},
    );

    expect(counts).toEqual({
      COMPLETE: 14,
      INFEASIBLE: 3,
      NO_ALLOCATION_REQUIRED: 3,
    });
  });

  it("디렉터리 개수와 목록 개수가 일치한다", () => {
    const dirs = readdirSync(FIXTURE_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    expect(dirs.sort()).toEqual(index.personas.map((p) => p.persona_id).sort());
  });
});

describe.each(index.personas.map((persona) => persona.persona_id))(
  "%s",
  (personaId) => {
    const dir = join(FIXTURE_DIR, personaId);

    it("profile.json이 계약을 지킨다", () => {
      expect(() =>
        personaProfileSchema.parse(readJson(join(dir, "profile.json"))),
      ).not.toThrow();
    });

    it("mydata.json이 계약을 지키고 잔액 합계가 맞는다", () => {
      const mydata = mydataSchema.parse(readJson(join(dir, "mydata.json")));
      const sum = mydata.accounts.reduce((acc, a) => acc + a.balance_amt, 0);

      expect(mydata.totals.total_balance).toBe(sum);
      expect(mydata.totals.account_count).toBe(mydata.accounts.length);
      expect(mydata.totals.loan_count).toBe(mydata.loans.length);
    });

    it("result.json이 계약을 지킨다", () => {
      expect(() =>
        portfolioResultSchema.parse(readJson(join(dir, "result.json"))),
      ).not.toThrow();
    });

    it("transactions.json이 public에 있고 계약을 지킨다", () => {
      const path = join(PUBLIC_DIR, personaId, "transactions.json");
      expect(existsSync(path)).toBe(true);
      expect(() => transactionsSchema.parse(readJson(path))).not.toThrow();
    });

    it("원본 계좌번호가 남아있지 않다", () => {
      const raw = [
        readFileSync(join(dir, "mydata.json"), "utf8"),
        readFileSync(join(PUBLIC_DIR, personaId, "transactions.json"), "utf8"),
      ].join("");

      expect(raw).not.toContain('"account_num"');
    });
  },
);
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `npx vitest run src/mocks/fixtures.test.ts`
Expected: FAIL — `ENOENT: no such file or directory, open '.../src/mocks/fixtures/index.json'`

- [ ] **Step 4: `scripts/build-fixtures.mjs` 구현**

```js
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  accountKind,
  accountTypeLabel,
  buildMonthlySummary,
  categoryOf,
  maskAccountNum,
  repayMethodLabel,
  savingMethodLabel,
  transTypeLabel,
} from "./lib/transform.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MYDATA_DIR = resolve(
  ROOT,
  process.env.MYDATA_DIR ?? "../housing-finance-core/app/data_pipeline/mydata",
);
const FIXTURE_DIR = join(ROOT, "src/mocks/fixtures");
const PUBLIC_DIR = join(ROOT, "public/fixtures");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function isoDate(ymd) {
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

function optional(key, value) {
  return value === undefined ? {} : { [key]: value };
}

function buildAccountsAndLoans(dir, accountList) {
  const accounts = [];
  const loans = [];
  const transactions = {};

  for (const account of accountList) {
    const kind = accountKind(account.account_type);
    const masked = maskAccountNum(account.account_num);

    if (kind === "loan") {
      const basic = readJson(
        join(dir, `bank_008_loan_basic_${account.account_num}.json`),
      );
      const detail = readJson(
        join(dir, `bank_009_loan_detail_${account.account_num}.json`),
      );

      loans.push({
        account_num_masked: masked,
        prod_name: account.prod_name,
        account_type: account.account_type,
        account_type_label: accountTypeLabel(account.account_type),
        balance_amt: detail.balance_amt,
        loan_principal: detail.loan_principal,
        last_offered_rate: basic.last_offered_rate,
        repay_method: basic.repay_method,
        repay_method_label: repayMethodLabel(basic.repay_method),
        issue_date: basic.issue_date,
        exp_date: basic.exp_date,
        next_repay_date: detail.next_repay_date,
      });
      continue;
    }

    const basic = readJson(
      join(dir, `bank_002_deposit_basic_${account.account_num}.json`),
    ).basic_list[0];
    const detail = readJson(
      join(dir, `bank_003_deposit_detail_${account.account_num}.json`),
    ).detail_list[0];

    const transPath = join(
      dir,
      `bank_004_deposit_trans_${account.account_num}.json`,
    );
    const hasTransactions = existsSync(transPath);

    if (hasTransactions) {
      transactions[masked] = {
        trans_list: readJson(transPath).trans_list.map((trans) => ({
          trans_dtime: trans.trans_dtime,
          trans_no: trans.trans_no,
          trans_type: trans.trans_type,
          trans_type_label: transTypeLabel(trans.trans_type),
          trans_class: trans.trans_class,
          trans_amt: trans.trans_amt,
          balance_amt: trans.balance_amt,
          trans_memo: trans.trans_memo,
        })),
      };
    }

    accounts.push({
      account_num_masked: masked,
      prod_name: account.prod_name,
      account_type: account.account_type,
      account_type_label: accountTypeLabel(account.account_type),
      account_kind: kind,
      saving_method: basic.saving_method,
      saving_method_label: savingMethodLabel(basic.saving_method),
      balance_amt: detail.balance_amt,
      withdrawable_amt: detail.withdrawable_amt,
      offered_rate: detail.offered_rate,
      issue_date: basic.issue_date,
      ...optional("exp_date", basic.exp_date),
      ...optional("commit_amt", basic.commit_amt),
      ...optional("monthly_paid_in_amt", basic.monthly_paid_in_amt),
      ...optional("last_paid_in_cnt", detail.last_paid_in_cnt),
      has_transactions: hasTransactions,
    });
  }

  return { accounts, loans, transactions };
}

function main() {
  const results = readJson(
    join(MYDATA_DIR, "college_student_portfolio_results.json"),
  );
  const resultSource = {
    generator: "college_student_portfolio_results.json",
    as_of: results.test_metadata.as_of,
  };

  rmSync(FIXTURE_DIR, { recursive: true, force: true });
  rmSync(PUBLIC_DIR, { recursive: true, force: true });

  const indexEntries = [];
  let mydataAsOf = null;

  for (const entry of results.personas) {
    const personaId = entry.persona_id;
    const dir = join(MYDATA_DIR, personaId);

    if (entry.persona_category !== categoryOf(personaId)) {
      throw new Error(
        `카테고리 불일치: ${personaId} — 결과는 ${entry.persona_category}, id는 ${categoryOf(personaId)}`,
      );
    }

    const userProfile = readJson(join(dir, "user_profile.json"));
    const preferences = readJson(join(dir, "savings_preferences.json"));
    const accountsFile = readJson(join(dir, "bank_001_accounts.json"));

    const asOf = accountsFile.search_timestamp.slice(0, 8);
    mydataAsOf = asOf;
    const mydataSource = { generator: "generate_all.py", as_of: isoDate(asOf) };

    const { accounts, loans, transactions } = buildAccountsAndLoans(
      dir,
      accountsFile.account_list,
    );

    const allTrans = Object.values(transactions).flatMap((a) => a.trans_list);

    writeJson(join(FIXTURE_DIR, personaId, "profile.json"), {
      persona_id: personaId,
      display_name: entry.persona_name,
      category: entry.persona_category,
      basic: {
        birth_date: userProfile.birth_date,
        age: userProfile.age_as_of,
        education_status: userProfile.education_status,
        military_service_status: userProfile.military_service_status,
        employment_type: userProfile.employment_type,
        marital_status: userProfile.marital_status,
        household_size: userProfile.household_size,
        lives_with_parents: userProfile.lives_with_parents,
        tuition_payer: userProfile.tuition_payer,
        current_housing_type: userProfile.current_housing_type,
      },
      goal: {
        target_housing_type: userProfile.target_housing_type,
        target_region: userProfile.target_region,
        target_price: userProfile.target_price,
        target_lease_deposit: userProfile.target_lease_deposit,
        target_monthly_rent: userProfile.target_monthly_rent,
        target_management_fee: userProfile.target_management_fee,
        target_move_in_ym: userProfile.target_move_in_ym,
        risk_preference: userProfile.risk_preference,
      },
      finance: {
        annual_income_verified: userProfile.annual_income_verified,
        monthly_income: userProfile.monthly_income,
        monthly_average_expense: userProfile.monthly_average_expense,
        ...optional("current_assets", userProfile.current_assets),
        ...optional("monthly_debt_payment", userProfile.monthly_debt_payment),
      },
      savings: {
        fund_needed_date: preferences.fund_needed_date,
        monthly_savings_budget: preferences.monthly_savings_budget,
        lump_sum_budget: preferences.lump_sum_budget,
        emergency_reserve: preferences.emergency_reserve,
        liquidity_preference: preferences.liquidity_preference,
        accepts_principal_risk: preferences.accepts_principal_risk,
        maximum_recommended_products: preferences.maximum_recommended_products,
      },
      source: mydataSource,
    });

    writeJson(join(FIXTURE_DIR, personaId, "mydata.json"), {
      persona_id: personaId,
      as_of: asOf,
      accounts,
      loans,
      monthly_summary: buildMonthlySummary(allTrans),
      totals: {
        account_count: accounts.length,
        loan_count: loans.length,
        total_balance: accounts.reduce((sum, a) => sum + a.balance_amt, 0),
        total_loan_balance: loans.reduce((sum, l) => sum + l.balance_amt, 0),
      },
      derived_by: "fixture-script",
      source: mydataSource,
    });

    const portfolio = entry.portfolio;

    writeJson(join(FIXTURE_DIR, personaId, "result.json"), {
      persona_id: personaId,
      display_name: entry.persona_name,
      category: entry.persona_category,
      status: portfolio.status,
      success: portfolio.success,
      coverage_ratio: portfolio.coverage_ratio,
      monthly_allocated: portfolio.monthly_allocated,
      monthly_unallocated: portfolio.monthly_unallocated,
      lump_sum_allocated: portfolio.lump_sum_allocated,
      lump_sum_unallocated: portfolio.lump_sum_unallocated,
      expected_total_principal: portfolio.expected_total_principal,
      expected_maturity_amount: portfolio.expected_maturity_amount,
      expected_net_interest: portfolio.expected_net_interest,
      final_policy_status: portfolio.final_policy_status,
      final_policy_valid: portfolio.final_policy_valid,
      reasons: portfolio.reasons,
      validation_reasons: portfolio.validation_reasons,
      allocations: portfolio.allocations,
      input: {
        age: entry.input.age,
        monthly_income: entry.input.monthly_income,
        monthly_expense: entry.input.monthly_expense,
        current_assets: entry.input.current_assets,
        monthly_savings_budget: entry.input.monthly_savings_budget,
        lump_sum_budget: entry.input.lump_sum_budget,
        fund_needed_date: entry.input.fund_needed_date,
      },
      evaluation: entry.evaluation,
      source: resultSource,
    });

    writeJson(join(PUBLIC_DIR, personaId, "transactions.json"), {
      persona_id: personaId,
      accounts: transactions,
      source: mydataSource,
    });

    indexEntries.push({
      persona_id: personaId,
      display_name: entry.persona_name,
      category: entry.persona_category,
      headline: {
        age: entry.input.age,
        monthly_income: entry.input.monthly_income,
        monthly_expense: entry.input.monthly_expense,
        target_price: userProfile.target_price,
        target_move_in_ym: userProfile.target_move_in_ym,
      },
      portfolio_status: portfolio.status,
    });
  }

  writeJson(join(FIXTURE_DIR, "index.json"), {
    as_of: mydataAsOf,
    personas: indexEntries,
  });

  console.log(`픽스처 ${indexEntries.length}명 생성 완료`);
  console.log(`  ${FIXTURE_DIR}`);
  console.log(`  ${PUBLIC_DIR}`);
}

main();
```

- [ ] **Step 5: 스크립트 실행**

Run: `npm run build:fixtures`
Expected: `픽스처 20명 생성 완료`. 오류가 나면 메시지의 계좌 유형·페르소나 id를 보고 원인을 특정한다 (core 데이터가 바뀐 경우다).

- [ ] **Step 6: 테스트 통과 확인**

Run: `npx vitest run src/mocks/fixtures.test.ts`
Expected: PASS. 목록 4건 + 페르소나별 5건 × 20명 = 104 tests.

- [ ] **Step 7: 전체 검증**

```bash
npm run typecheck && npm run test && npm run build
```

Expected: 모두 PASS.

- [ ] **Step 8: 커밋**

```bash
git add package.json scripts/build-fixtures.mjs src/mocks public/fixtures
git commit -m "$(cat <<'EOF'
feat(fixtures): generate and commit persona fixtures for 20 students

백엔드 가동 여부와 무관하게 CI·배포·시연이 동작하도록 산출물을 커밋한다.
core는 읽기만 하며 MYDATA_DIR로 경로를 받는다. 거래내역은 1인당 약 90KB라
서버 페이로드에 싣지 않고 public/에 두어 탭을 열 때 받는다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: 픽스처 로더와 페르소나 가드

**Files:**
- Create: `src/lib/fixtures/loader.ts`, `src/lib/fixtures/loader.test.ts`
- Create: `src/lib/fixtures/guard.ts`

**Interfaces:**
- Consumes: Task 4의 스키마, Task 6의 픽스처
- Produces:
  - `loader.ts` — `loadPersonaIndex(): PersonaIndex` · `isKnownPersona(personaId: string | undefined): personaId is string` · `loadProfile(personaId: string): Promise<PersonaProfile>` · `loadMydata(personaId: string): Promise<Mydata>` · `loadResult(personaId: string): Promise<PortfolioResult>` · `transactionsUrl(personaId: string): string`
  - `guard.ts` — `requirePersonaId(raw: string | string[] | undefined): string` — 목록에 없으면 `/personas`로 `redirect()`

`redirect`를 `loader.ts`에 두면 컴포넌트 테스트가 전부 `next/navigation`을 끌어오게 된다. 서버 전용 의존성을 `guard.ts`로 분리해 로더를 순수하게 유지한다.

- [ ] **Step 1: `src/lib/fixtures/loader.test.ts` — 실패하는 테스트 작성**

```ts
import { describe, expect, it } from "vitest";

import {
  isKnownPersona,
  loadMydata,
  loadPersonaIndex,
  loadProfile,
  loadResult,
  transactionsUrl,
} from "./loader";

const SAMPLE = "persona_e_college_student_basic";

describe("loadPersonaIndex", () => {
  it("20명을 검증된 형태로 돌려준다", () => {
    expect(loadPersonaIndex().personas).toHaveLength(20);
  });
});

describe("isKnownPersona", () => {
  it("목록에 있는 id만 통과시킨다", () => {
    expect(isKnownPersona(SAMPLE)).toBe(true);
    expect(isKnownPersona("persona_a_social_starter")).toBe(false);
    expect(isKnownPersona(undefined)).toBe(false);
    expect(isKnownPersona("")).toBe(false);
  });
});

describe("페르소나별 로더", () => {
  it("profile을 파싱해서 돌려준다", async () => {
    const profile = await loadProfile(SAMPLE);
    expect(profile.persona_id).toBe(SAMPLE);
    expect(profile.goal.target_housing_type).toBe("monthly_rent");
  });

  it("mydata를 파싱해서 돌려준다", async () => {
    const mydata = await loadMydata(SAMPLE);
    expect(mydata.derived_by).toBe("fixture-script");
    expect(mydata.accounts.length).toBeGreaterThan(0);
  });

  it("result를 파싱해서 돌려준다", async () => {
    const result = await loadResult(SAMPLE);
    expect(result.status).toBe("COMPLETE");
  });

  it("없는 페르소나는 던진다", async () => {
    await expect(loadProfile("persona_zz_nobody")).rejects.toThrow(
      "알 수 없는 페르소나: persona_zz_nobody",
    );
  });
});

describe("transactionsUrl", () => {
  it("public 정적 경로를 돌려준다", () => {
    expect(transactionsUrl(SAMPLE)).toBe(`/fixtures/${SAMPLE}/transactions.json`);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/lib/fixtures/loader.test.ts`
Expected: FAIL — `Failed to resolve import "./loader"`

- [ ] **Step 3: `src/lib/fixtures/loader.ts` 구현**

```ts
import {
  type Mydata,
  type PersonaIndex,
  type PersonaProfile,
  mydataSchema,
  personaIndexSchema,
  personaProfileSchema,
} from "@/lib/contracts/persona";
import { type PortfolioResult, portfolioResultSchema } from "@/lib/contracts/result";
import rawIndex from "@/mocks/fixtures/index.json";

let cachedIndex: PersonaIndex | null = null;

export function loadPersonaIndex(): PersonaIndex {
  cachedIndex ??= personaIndexSchema.parse(rawIndex);
  return cachedIndex;
}

export function isKnownPersona(
  personaId: string | undefined,
): personaId is string {
  if (!personaId) return false;

  return loadPersonaIndex().personas.some(
    (persona) => persona.persona_id === personaId,
  );
}

function assertKnown(personaId: string): void {
  if (!isKnownPersona(personaId)) {
    throw new Error(`알 수 없는 페르소나: ${personaId}`);
  }
}

export async function loadProfile(personaId: string): Promise<PersonaProfile> {
  assertKnown(personaId);
  const mod = await import(`../../mocks/fixtures/${personaId}/profile.json`);
  return personaProfileSchema.parse(mod.default);
}

export async function loadMydata(personaId: string): Promise<Mydata> {
  assertKnown(personaId);
  const mod = await import(`../../mocks/fixtures/${personaId}/mydata.json`);
  return mydataSchema.parse(mod.default);
}

export async function loadResult(personaId: string): Promise<PortfolioResult> {
  assertKnown(personaId);
  const mod = await import(`../../mocks/fixtures/${personaId}/result.json`);
  return portfolioResultSchema.parse(mod.default);
}

export function transactionsUrl(personaId: string): string {
  return `/fixtures/${personaId}/transactions.json`;
}
```

- [ ] **Step 3b: `src/lib/fixtures/guard.ts` 구현**

```ts
import { redirect } from "next/navigation";

import { isKnownPersona } from "./loader";

export function requirePersonaId(raw: string | string[] | undefined): string {
  const personaId = Array.isArray(raw) ? raw[0] : raw;

  if (!isKnownPersona(personaId)) {
    redirect("/personas");
  }

  return personaId;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/fixtures/loader.test.ts`
Expected: PASS (7 tests)

동적 `import()`가 vite에서 해석되지 않으면 `../../mocks/fixtures/` 경로가 리터럴 접두사로 시작하는지 확인한다. 변수만으로 시작하는 경로는 번들러가 컨텍스트를 만들지 못한다.

- [ ] **Step 5: 전체 검증**

```bash
npm run typecheck && npm run test && npm run build
```

Expected: 모두 PASS.

- [ ] **Step 6: 커밋**

```bash
git add src/lib/fixtures
git commit -m "$(cat <<'EOF'
feat(fixtures): add validated loader and persona guard

픽스처가 계약을 어기면 화면이 아니라 로드 시점에 실패하도록
모든 진입점에서 zod parse를 통과시킨다. 목록에 없는 persona 쿼리는
requirePersonaId가 /personas로 되돌린다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: 페르소나 선택 화면

**Files:**
- Create: `vitest.setup.ts`
- Create: `src/lib/format/codes.ts`, `src/lib/format/codes.test.ts`
- Create: `src/features/personas/persona-grid.tsx`, `src/features/personas/persona-grid.test.tsx`
- Create: `src/app/personas/page.tsx`
- Modify: `vitest.config.ts` (jsdom + React 플러그인)
- Modify: `package.json`

**Interfaces:**
- Consumes: `loadPersonaIndex()` · `formatKoreanUnit()` · `formatYm()` · shadcn `Card`/`Badge`/`Button`
- Produces:
  - `codes.ts` — `categoryLabel(category)` · `portfolioStatusLabel(status)` · `housingTypeLabel(code)` · `riskPreferenceLabel(code)` · `educationStatusLabel(code)` · `employmentTypeLabel(code)` · `tuitionPayerLabel(code)` · `liquidityPreferenceLabel(code)`
  - `PersonaGrid({ personas }: { personas: PersonaIndexEntry[] })`

- [ ] **Step 1: 테스트 도구 설치**

```bash
npm i -D jsdom @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: `vitest.setup.ts` 작성**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: `vitest.config.ts` 교체**

```ts
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "scripts/**/*.test.mjs",
    ],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

- [ ] **Step 4: 기존 테스트가 여전히 통과하는지 확인**

Run: `npm run test`
Expected: PASS. jsdom 환경으로 바뀌어도 `node:fs`를 쓰는 픽스처 테스트는 그대로 동작한다.

- [ ] **Step 5: `src/lib/format/codes.test.ts` — 실패하는 테스트 작성**

```ts
import { describe, expect, it } from "vitest";

import {
  categoryLabel,
  educationStatusLabel,
  employmentTypeLabel,
  housingTypeLabel,
  liquidityPreferenceLabel,
  portfolioStatusLabel,
  riskPreferenceLabel,
  tuitionPayerLabel,
} from "./codes";

describe("codes", () => {
  it("카테고리를 한글로 바꾼다", () => {
    expect(categoryLabel("basic")).toBe("기본형");
    expect(categoryLabel("affluent")).toBe("여유형");
    expect(categoryLabel("poor")).toBe("취약형");
  });

  it("포트폴리오 상태를 한글로 바꾼다", () => {
    expect(portfolioStatusLabel("COMPLETE")).toBe("배분 완료");
    expect(portfolioStatusLabel("INFEASIBLE")).toBe("배분 불가");
    expect(portfolioStatusLabel("NO_ALLOCATION_REQUIRED")).toBe("배분 불필요");
  });

  it("프로필 코드값을 한글로 바꾼다", () => {
    expect(housingTypeLabel("monthly_rent")).toBe("월세");
    expect(housingTypeLabel("living_with_parents")).toBe("부모님과 거주");
    expect(riskPreferenceLabel("stability")).toBe("안정형");
    expect(educationStatusLabel("university_student")).toBe("대학 재학");
    expect(employmentTypeLabel("part_time")).toBe("아르바이트");
    expect(tuitionPayerLabel("parents")).toBe("부모님");
    expect(liquidityPreferenceLabel("high")).toBe("높음");
  });

  it("모르는 코드는 원문을 그대로 돌려준다", () => {
    expect(housingTypeLabel("villa")).toBe("villa");
    expect(riskPreferenceLabel("aggressive_x")).toBe("aggressive_x");
  });
});
```

- [ ] **Step 6: 테스트가 실패하는지 확인**

Run: `npx vitest run src/lib/format/codes.test.ts`
Expected: FAIL — `Failed to resolve import "./codes"`

- [ ] **Step 7: `src/lib/format/codes.ts` 구현**

화면에 보이는 코드값만 다룬다. 스크립트(`scripts/lib/transform.mjs`)의 라벨과 달리, 여기서는 모르는 코드를 던지지 않고 원문을 그대로 보여준다 — 데이터가 늘어도 화면이 죽지 않게 하기 위함이다.

```ts
import type { PersonaCategory, PortfolioStatus } from "@/lib/contracts/persona";

function lookup(table: Record<string, string>, code: string): string {
  return table[code] ?? code;
}

const CATEGORY: Record<PersonaCategory, string> = {
  basic: "기본형",
  affluent: "여유형",
  poor: "취약형",
};

const PORTFOLIO_STATUS: Record<PortfolioStatus, string> = {
  COMPLETE: "배분 완료",
  INFEASIBLE: "배분 불가",
  NO_ALLOCATION_REQUIRED: "배분 불필요",
};

export function categoryLabel(category: PersonaCategory): string {
  return CATEGORY[category];
}

export function portfolioStatusLabel(status: PortfolioStatus): string {
  return PORTFOLIO_STATUS[status];
}

export function housingTypeLabel(code: string): string {
  return lookup(
    {
      monthly_rent: "월세",
      jeonse: "전세",
      owned: "자가",
      living_with_parents: "부모님과 거주",
      dormitory: "기숙사",
    },
    code,
  );
}

export function riskPreferenceLabel(code: string): string {
  return lookup(
    { stability: "안정형", balanced: "중립형", aggressive: "공격형" },
    code,
  );
}

export function educationStatusLabel(code: string): string {
  return lookup(
    {
      university_student: "대학 재학",
      university_leave: "대학 휴학",
      graduated: "졸업",
      high_school: "고등학교 졸업",
    },
    code,
  );
}

export function employmentTypeLabel(code: string): string {
  return lookup(
    {
      part_time: "아르바이트",
      full_time: "정규직",
      contract: "계약직",
      freelance: "프리랜서",
      none: "무직",
    },
    code,
  );
}

export function tuitionPayerLabel(code: string): string {
  return lookup(
    { parents: "부모님", self: "본인", scholarship: "장학금", loan: "학자금대출" },
    code,
  );
}

export function liquidityPreferenceLabel(code: string): string {
  return lookup({ high: "높음", medium: "보통", low: "낮음" }, code);
}
```

- [ ] **Step 8: 테스트 통과 확인**

Run: `npx vitest run src/lib/format/codes.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 9: `src/features/personas/persona-grid.test.tsx` — 실패하는 테스트 작성**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { loadPersonaIndex } from "@/lib/fixtures/loader";

import { PersonaGrid } from "./persona-grid";

const personas = loadPersonaIndex().personas;

describe("PersonaGrid", () => {
  it("20명을 카드로 보여준다", () => {
    render(<PersonaGrid personas={personas} />);
    expect(screen.getAllByRole("link")).toHaveLength(20);
  });

  it("카드가 입력 화면으로 연결된다", () => {
    render(<PersonaGrid personas={personas} />);
    const first = screen.getAllByRole("link")[0];
    expect(first).toHaveAttribute(
      "href",
      `/input?persona=${personas[0].persona_id}`,
    );
  });

  it("금액을 한글 단위로 보여준다", () => {
    render(<PersonaGrid personas={[personas[0]]} />);
    expect(screen.getByText("80만원")).toBeInTheDocument();
    expect(screen.getByText("500만원")).toBeInTheDocument();
  });

  it("카테고리 필터가 목록을 줄인다", async () => {
    const user = userEvent.setup();
    render(<PersonaGrid personas={personas} />);

    await user.click(screen.getByRole("button", { name: /여유형/ }));
    expect(screen.getAllByRole("link")).toHaveLength(6);

    await user.click(screen.getByRole("button", { name: /취약형/ }));
    expect(screen.getAllByRole("link")).toHaveLength(7);

    await user.click(screen.getByRole("button", { name: /전체/ }));
    expect(screen.getAllByRole("link")).toHaveLength(20);
  });

  it("배분 불가 페르소나에 상태 배지를 붙인다", () => {
    render(<PersonaGrid personas={personas} />);
    expect(screen.getAllByText("배분 불가")).toHaveLength(3);
    expect(screen.getAllByText("배분 불필요")).toHaveLength(3);
  });
});
```

- [ ] **Step 10: 테스트가 실패하는지 확인**

Run: `npx vitest run src/features/personas/persona-grid.test.tsx`
Expected: FAIL — `Failed to resolve import "./persona-grid"`

- [ ] **Step 11: `src/features/personas/persona-grid.tsx` 구현**

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PersonaCategory, PersonaIndexEntry } from "@/lib/contracts/persona";
import { formatYm } from "@/lib/format/date";
import { categoryLabel, portfolioStatusLabel } from "@/lib/format/codes";
import { formatKoreanUnit } from "@/lib/format/money";

type Filter = PersonaCategory | "all";

const FILTERS: Filter[] = ["all", "basic", "affluent", "poor"];

function filterLabel(filter: Filter, count: number): string {
  const name = filter === "all" ? "전체" : categoryLabel(filter);
  return `${name} ${count}`;
}

export function PersonaGrid({ personas }: { personas: PersonaIndexEntry[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const visible =
    filter === "all"
      ? personas
      : personas.filter((persona) => persona.category === filter);

  return (
    <section className="py-12">
      <h1 className="mb-2 text-3xl font-bold tracking-[-0.04em]">
        페르소나 선택
      </h1>
      <p className="mb-6 text-muted">
        대학생 20명의 합성 마이데이터입니다. 한 명을 고르면 입력폼이 자동으로
        채워집니다.
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((option) => {
          const count =
            option === "all"
              ? personas.length
              : personas.filter((persona) => persona.category === option).length;

          return (
            <Button
              key={option}
              variant={filter === option ? "default" : "outline"}
              onClick={() => setFilter(option)}
            >
              {filterLabel(option, count)}
            </Button>
          );
        })}
      </div>

      <ul className="grid grid-cols-1 gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((persona) => (
          <li key={persona.persona_id}>
            <Link
              className="block h-full"
              href={`/input?persona=${persona.persona_id}`}
            >
              <Card className="h-full border-line transition-colors hover:border-accent">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">
                      {persona.display_name}
                    </CardTitle>
                    <Badge variant="outline">
                      {categoryLabel(persona.category)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm">
                  <Row label="나이" value={`만 ${persona.headline.age}세`} />
                  <Row
                    label="월 소득"
                    value={formatKoreanUnit(persona.headline.monthly_income)}
                  />
                  <Row
                    label="월 지출"
                    value={formatKoreanUnit(persona.headline.monthly_expense)}
                  />
                  <Row
                    label="목표 보증금"
                    value={formatKoreanUnit(persona.headline.target_price)}
                  />
                  <Row
                    label="목표 시점"
                    value={formatYm(persona.headline.target_move_in_ym)}
                  />
                  {persona.portfolio_status !== "COMPLETE" && (
                    <p className="mt-1 text-xs font-semibold text-muted">
                      {portfolioStatusLabel(persona.portfolio_status)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </span>
  );
}
```

- [ ] **Step 12: 테스트 통과 확인**

Run: `npx vitest run src/features/personas/persona-grid.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 13: `src/app/personas/page.tsx` 작성**

```tsx
import { PersonaGrid } from "@/features/personas/persona-grid";
import { loadPersonaIndex } from "@/lib/fixtures/loader";

export default function PersonasPage() {
  const index = loadPersonaIndex();

  return (
    <main>
      <PersonaGrid personas={index.personas} />
    </main>
  );
}
```

- [ ] **Step 14: 전체 검증**

```bash
npm run typecheck && npm run test && npm run build
```

Expected: 모두 PASS.

`npm run dev`로 `http://localhost:3000/personas`를 열어 카드 20장과 필터 4개가 보이는지 확인한 뒤 dev 서버를 종료한다.

- [ ] **Step 15: 커밋**

```bash
git add vitest.config.ts vitest.setup.ts package.json package-lock.json src/lib/format/codes.ts src/lib/format/codes.test.ts src/features/personas src/app/personas
git commit -m "$(cat <<'EOF'
feat(personas): add persona selection grid

카드에 나이·소득·지출·목표를 요약하고 카테고리로 거를 수 있게 한다.
배분이 없는 6명은 카드 단계에서 상태를 드러내 결과 화면에서 놀라지 않게 했다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: 입력 위저드 셸과 step 1 (기본정보)

**Files:**
- Create: `src/features/input/form-schema.ts`, `src/features/input/form-schema.test.ts`
- Create: `src/features/input/input-wizard.tsx`, `src/features/input/input-wizard.test.tsx`
- Create: `src/features/input/step-basic.tsx`
- Create: `src/features/input/field-row.tsx`
- Modify: `src/app/input/page.tsx` (placeholder 제거)
- Modify: `package.json`

**Interfaces:**
- Consumes: `requirePersonaId()` · `loadProfile()` · `loadMydata()` · `codes.ts` 라벨 함수
- Produces:
  - `inputFormSchema` · `InputFormValues` 타입
  - `toFormValues(profile: PersonaProfile): InputFormValues`
  - `changedFields(defaults: InputFormValues, values: InputFormValues): string[]`
  - `InputWizard({ personaId, profile, mydata }: {...})`
  - `StepBasic({ profile }: { profile: PersonaProfile })` — `useFormContext()`로 폼에 접근
  - `FieldRow({ label, children })` · `ReadonlyRow({ label, value })`

- [ ] **Step 1: 폼 라이브러리 설치**

```bash
npm i react-hook-form @hookform/resolvers
```

- [ ] **Step 2: `src/features/input/form-schema.test.ts` — 실패하는 테스트 작성**

```ts
import { describe, expect, it } from "vitest";

import { loadProfile } from "@/lib/fixtures/loader";

import { changedFields, inputFormSchema, toFormValues } from "./form-schema";

const SAMPLE = "persona_e_college_student_basic";

describe("inputFormSchema", () => {
  it("문자열로 들어온 숫자를 숫자로 바꾼다", () => {
    const parsed = inputFormSchema.parse({
      age: "25",
      household_size: "3",
      monthly_income: "800000",
      monthly_average_expense: "700000",
      target_price: "5000000",
      target_monthly_rent: "200000",
      target_management_fee: "50000",
      target_move_in_ym: "202807",
      risk_preference: "stability",
      monthly_savings_budget: "100000",
      lump_sum_budget: "300000",
      emergency_reserve: "700000",
    });

    expect(parsed.age).toBe(25);
    expect(parsed.monthly_income).toBe(800000);
  });

  it("목표 시점이 YYYYMM이 아니면 거부한다", () => {
    const result = inputFormSchema.safeParse({
      age: 25,
      household_size: 3,
      monthly_income: 800000,
      monthly_average_expense: 700000,
      target_price: 5000000,
      target_monthly_rent: 200000,
      target_management_fee: 50000,
      target_move_in_ym: "2028-07",
      risk_preference: "stability",
      monthly_savings_budget: 100000,
      lump_sum_budget: 300000,
      emergency_reserve: 700000,
    });

    expect(result.success).toBe(false);
  });
});

describe("toFormValues", () => {
  it("프로필을 폼 기본값으로 옮긴다", async () => {
    const values = toFormValues(await loadProfile(SAMPLE));

    expect(values.age).toBe(25);
    expect(values.monthly_income).toBe(800000);
    expect(values.target_price).toBe(5000000);
    expect(values.target_move_in_ym).toBe("202807");
    expect(values.monthly_savings_budget).toBe(100000);
  });

  it("current_assets가 없는 프로필도 처리한다", async () => {
    expect(toFormValues(await loadProfile(SAMPLE)).current_assets).toBeUndefined();
  });
});

describe("changedFields", () => {
  it("바뀐 필드 이름을 돌려준다", async () => {
    const defaults = toFormValues(await loadProfile(SAMPLE));
    const changed = changedFields(defaults, {
      ...defaults,
      target_price: 9000000,
      monthly_savings_budget: 250000,
    });

    expect(changed.sort()).toEqual(["monthly_savings_budget", "target_price"]);
  });

  it("그대로면 빈 배열이다", async () => {
    const defaults = toFormValues(await loadProfile(SAMPLE));
    expect(changedFields(defaults, { ...defaults })).toEqual([]);
  });
});
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `npx vitest run src/features/input/form-schema.test.ts`
Expected: FAIL — `Failed to resolve import "./form-schema"`

- [ ] **Step 4: `src/features/input/form-schema.ts` 구현**

```ts
import { z } from "zod";

import type { PersonaProfile } from "@/lib/contracts/persona";

const won = z.coerce.number().min(0, "0 이상이어야 합니다");

export const inputFormSchema = z.object({
  age: z.coerce.number().int().min(1, "나이를 입력하세요"),
  household_size: z.coerce.number().int().min(1, "가구원수를 입력하세요"),
  monthly_income: won,
  monthly_average_expense: won,
  current_assets: won.optional(),
  target_price: won,
  target_monthly_rent: won,
  target_management_fee: won,
  target_move_in_ym: z
    .string()
    .regex(/^\d{6}$/, "YYYYMM 형식으로 입력하세요"),
  risk_preference: z.string().min(1, "위험 성향을 선택하세요"),
  monthly_savings_budget: won,
  lump_sum_budget: won,
  emergency_reserve: won,
});

export type InputFormValues = z.infer<typeof inputFormSchema>;

export function toFormValues(profile: PersonaProfile): InputFormValues {
  return {
    age: profile.basic.age,
    household_size: profile.basic.household_size,
    monthly_income: profile.finance.monthly_income,
    monthly_average_expense: profile.finance.monthly_average_expense,
    current_assets: profile.finance.current_assets,
    target_price: profile.goal.target_price,
    target_monthly_rent: profile.goal.target_monthly_rent,
    target_management_fee: profile.goal.target_management_fee,
    target_move_in_ym: profile.goal.target_move_in_ym,
    risk_preference: profile.goal.risk_preference,
    monthly_savings_budget: profile.savings.monthly_savings_budget,
    lump_sum_budget: profile.savings.lump_sum_budget,
    emergency_reserve: profile.savings.emergency_reserve,
  };
}

export function changedFields(
  defaults: InputFormValues,
  values: InputFormValues,
): string[] {
  return (Object.keys(defaults) as (keyof InputFormValues)[])
    .filter((key) => defaults[key] !== values[key])
    .map(String);
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run src/features/input/form-schema.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: `src/features/input/field-row.tsx` 작성**

```tsx
import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

export function FieldRow({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p className="text-xs font-semibold text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function ReadonlyRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
```

- [ ] **Step 7: `src/features/input/step-basic.tsx` 작성**

편집 가능한 값은 숫자 4종이고, 코드값 프로필 항목은 라벨로 보여준다. `current_assets`·`monthly_debt_payment`는 페르소나마다 있고 없으므로 **있을 때만 렌더**한다 (스펙 §5.3).

```tsx
"use client";

import { useFormContext } from "react-hook-form";

import { Input } from "@/components/ui/input";
import type { PersonaProfile } from "@/lib/contracts/persona";
import {
  educationStatusLabel,
  employmentTypeLabel,
  housingTypeLabel,
  tuitionPayerLabel,
} from "@/lib/format/codes";
import { formatKoreanUnit } from "@/lib/format/money";

import { FieldRow, ReadonlyRow } from "./field-row";
import type { InputFormValues } from "./form-schema";

export function StepBasic({ profile }: { profile: PersonaProfile }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<InputFormValues>();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="grid gap-4">
        <FieldRow label="나이" htmlFor="age" error={errors.age?.message}>
          <Input id="age" type="number" {...register("age")} />
        </FieldRow>

        <FieldRow
          label="가구원수"
          htmlFor="household_size"
          error={errors.household_size?.message}
        >
          <Input
            id="household_size"
            type="number"
            {...register("household_size")}
          />
        </FieldRow>

        <FieldRow
          label="월 소득 (원)"
          htmlFor="monthly_income"
          hint={formatKoreanUnit(profile.finance.monthly_income)}
          error={errors.monthly_income?.message}
        >
          <Input
            id="monthly_income"
            type="number"
            {...register("monthly_income")}
          />
        </FieldRow>

        <FieldRow
          label="월 평균 지출 (원)"
          htmlFor="monthly_average_expense"
          hint={formatKoreanUnit(profile.finance.monthly_average_expense)}
          error={errors.monthly_average_expense?.message}
        >
          <Input
            id="monthly_average_expense"
            type="number"
            {...register("monthly_average_expense")}
          />
        </FieldRow>

        {profile.finance.current_assets !== undefined && (
          <FieldRow
            label="보유 자산 (원)"
            htmlFor="current_assets"
            error={errors.current_assets?.message}
          >
            <Input
              id="current_assets"
              type="number"
              {...register("current_assets")}
            />
          </FieldRow>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-bold text-muted">
          마이데이터에서 확인된 정보
        </h3>
        <ReadonlyRow
          label="학적"
          value={educationStatusLabel(profile.basic.education_status)}
        />
        <ReadonlyRow
          label="고용 형태"
          value={employmentTypeLabel(profile.basic.employment_type)}
        />
        <ReadonlyRow
          label="등록금 납부자"
          value={tuitionPayerLabel(profile.basic.tuition_payer)}
        />
        <ReadonlyRow
          label="현재 거주 형태"
          value={housingTypeLabel(profile.basic.current_housing_type)}
        />
        <ReadonlyRow
          label="부모님과 거주"
          value={profile.basic.lives_with_parents ? "예" : "아니오"}
        />
        <ReadonlyRow
          label="연 소득 (증빙)"
          value={formatKoreanUnit(profile.finance.annual_income_verified)}
        />
        {profile.finance.monthly_debt_payment !== undefined && (
          <ReadonlyRow
            label="월 부채 상환액"
            value={formatKoreanUnit(profile.finance.monthly_debt_payment)}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: `src/features/input/input-wizard.test.tsx` — 실패하는 테스트 작성**

step 2·3 본문은 Task 10~12에서 채우므로, 이 태스크에서는 **셸의 동작**(단계 이동·프리필·검증)만 확인한다.

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { loadMydata, loadProfile } from "@/lib/fixtures/loader";

import { InputWizard } from "./input-wizard";

const SAMPLE = "persona_e_college_student_basic";

async function renderWizard() {
  const [profile, mydata] = await Promise.all([
    loadProfile(SAMPLE),
    loadMydata(SAMPLE),
  ]);

  render(<InputWizard personaId={SAMPLE} profile={profile} mydata={mydata} />);
  return { profile, mydata };
}

describe("InputWizard", () => {
  it("step 1에서 프로필 값이 프리필된다", async () => {
    await renderWizard();

    expect(screen.getByLabelText("나이")).toHaveValue(25);
    expect(screen.getByLabelText("월 소득 (원)")).toHaveValue(800000);
    expect(screen.getByLabelText("월 평균 지출 (원)")).toHaveValue(700000);
  });

  it("코드값을 한글 라벨로 보여준다", async () => {
    await renderWizard();

    expect(screen.getByText("대학 재학")).toBeInTheDocument();
    expect(screen.getByText("아르바이트")).toBeInTheDocument();
  });

  it("다음 버튼으로 step 2로 이동한다", async () => {
    const user = userEvent.setup();
    await renderWizard();

    await user.click(screen.getByRole("button", { name: "다음" }));
    expect(screen.getByRole("heading", { name: /마이데이터/ })).toBeInTheDocument();
  });

  it("나이를 비우면 다음으로 넘어가지 않는다", async () => {
    const user = userEvent.setup();
    await renderWizard();

    await user.clear(screen.getByLabelText("나이"));
    await user.click(screen.getByRole("button", { name: "다음" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "나이를 입력하세요",
    );
    expect(
      screen.queryByRole("heading", { name: /마이데이터/ }),
    ).not.toBeInTheDocument();
  });

  it("step 1에서는 이전 버튼이 없다", async () => {
    await renderWizard();
    expect(screen.queryByRole("button", { name: "이전" })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 9: 테스트가 실패하는지 확인**

Run: `npx vitest run src/features/input/input-wizard.test.tsx`
Expected: FAIL — `Failed to resolve import "./input-wizard"`

- [ ] **Step 10: `src/features/input/input-wizard.tsx` 구현**

step 2·3 자리는 Task 10~12에서 교체한다. 지금은 제목만 둔다.

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import type { Mydata, PersonaProfile } from "@/lib/contracts/persona";

import {
  type InputFormValues,
  inputFormSchema,
  toFormValues,
} from "./form-schema";
import { StepBasic } from "./step-basic";

const STEP_TITLES = ["기본정보", "마이데이터", "목표설정"] as const;

export function InputWizard({
  personaId,
  profile,
  mydata,
}: {
  personaId: string;
  profile: PersonaProfile;
  mydata: Mydata;
}) {
  const [step, setStep] = useState(0);
  const defaultValues = toFormValues(profile);

  const form = useForm<InputFormValues>({
    resolver: zodResolver(inputFormSchema),
    defaultValues,
    mode: "onSubmit",
  });

  async function goNext() {
    if (step === 0) {
      const valid = await form.trigger();
      if (!valid) return;
    }

    setStep((current) => Math.min(current + 1, STEP_TITLES.length - 1));
  }

  return (
    <section className="py-12">
      <p className="m-0 font-bold text-accent">{profile.display_name}</p>
      <h1 className="mb-6 text-3xl font-bold tracking-[-0.04em]">
        step {step + 1}. {STEP_TITLES[step]}
      </h1>

      <FormProvider {...form}>
        <form onSubmit={(event) => event.preventDefault()}>
          {step === 0 && <StepBasic profile={profile} />}
          {step === 1 && (
            <h2 className="text-xl font-bold">마이데이터 불러오기</h2>
          )}
          {step === 2 && <h2 className="text-xl font-bold">목표설정</h2>}

          <div className="mt-8 flex gap-2">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((current) => current - 1)}
              >
                이전
              </Button>
            )}
            {step < STEP_TITLES.length - 1 && (
              <Button type="button" onClick={goNext}>
                다음
              </Button>
            )}
          </div>
        </form>
      </FormProvider>
    </section>
  );
}
```

`personaId`와 `mydata`는 Task 10·12에서 쓴다. 이 태스크에서 타입 오류를 피하려면 `void personaId;` 같은 임시 코드를 넣지 말고, props를 그대로 두되 `StepBasic`만 사용하면 된다 — 미사용 props는 TypeScript 오류가 아니다.

- [ ] **Step 11: 테스트 통과 확인**

Run: `npx vitest run src/features/input/input-wizard.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 12: `src/app/input/page.tsx` 교체**

Next 16에서 `searchParams`는 Promise다. 반드시 `await`한다.

```tsx
import { InputWizard } from "@/features/input/input-wizard";
import { requirePersonaId } from "@/lib/fixtures/guard";
import { loadMydata, loadProfile } from "@/lib/fixtures/loader";

export default async function InputPage({
  searchParams,
}: {
  searchParams: Promise<{ persona?: string | string[] }>;
}) {
  const personaId = requirePersonaId((await searchParams).persona);
  const [profile, mydata] = await Promise.all([
    loadProfile(personaId),
    loadMydata(personaId),
  ]);

  return (
    <main>
      <InputWizard personaId={personaId} profile={profile} mydata={mydata} />
    </main>
  );
}
```

- [ ] **Step 13: 전체 검증**

```bash
npm run typecheck && npm run test && npm run build
```

Expected: 모두 PASS.

`npm run dev`로 다음 두 가지를 확인한 뒤 종료한다.
1. `http://localhost:3000/input?persona=persona_e_college_student_basic` → 값이 채워진 폼
2. `http://localhost:3000/input?persona=persona_a_social_starter` → `/personas`로 리다이렉트

- [ ] **Step 14: 커밋**

```bash
git add package.json package-lock.json src/features/input src/app/input
git commit -m "$(cat <<'EOF'
feat(input): add wizard shell and basic info step

페르소나 값을 프리필하되 폼은 실제로 편집·검증되게 만든다.
프리필 소스만 교체하면 실서비스 구조가 되도록 한 것이다.
페르소나마다 있고 없는 필드는 존재할 때만 렌더한다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: step 2 — 마이데이터 계좌·예적금·대출 탭

**Files:**
- Create: `src/features/mydata/mydata-panel.tsx`, `src/features/mydata/mydata-panel.test.tsx`
- Create: `src/features/mydata/account-list.tsx`
- Create: `src/features/mydata/loan-list.tsx`
- Create: `src/features/input/step-mydata.tsx`
- Modify: `src/features/input/input-wizard.tsx` (step 2 자리 교체)

**Interfaces:**
- Consumes: `Mydata` · `MydataAccount` · `MydataLoan` · 포맷터 · shadcn `Tabs`/`Table`/`Button`
- Produces:
  - `MydataPanel({ personaId, mydata }: { personaId: string; mydata: Mydata })`
  - `AccountList({ accounts }: { accounts: MydataAccount[] })`
  - `LoanList({ loans }: { loans: MydataLoan[] })`
  - `StepMydata({ personaId, mydata }: {...})`

- [ ] **Step 1: `src/features/mydata/mydata-panel.test.tsx` — 실패하는 테스트 작성**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { loadMydata } from "@/lib/fixtures/loader";

import { MydataPanel } from "./mydata-panel";

const WITH_LOAN = "persona_s_college_student_15_poor";
const NO_LOAN = "persona_e_college_student_basic";

describe("MydataPanel", () => {
  it("불러오기 전에는 목록을 보여주지 않는다", async () => {
    render(<MydataPanel personaId={NO_LOAN} mydata={await loadMydata(NO_LOAN)} />);

    expect(
      screen.getByRole("button", { name: "마이데이터 불러오기" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /계좌/ })).not.toBeInTheDocument();
  });

  it("불러오기를 누르면 탭이 나타난다", async () => {
    const user = userEvent.setup();
    render(<MydataPanel personaId={NO_LOAN} mydata={await loadMydata(NO_LOAN)} />);

    await user.click(screen.getByRole("button", { name: "마이데이터 불러오기" }));

    expect(screen.getByRole("tab", { name: /계좌/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /예적금/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /대출/ })).toBeInTheDocument();
  });

  it("계좌 탭에 마스킹된 계좌번호와 잔액을 보여준다", async () => {
    const user = userEvent.setup();
    const mydata = await loadMydata(NO_LOAN);
    render(<MydataPanel personaId={NO_LOAN} mydata={mydata} />);

    await user.click(screen.getByRole("button", { name: "마이데이터 불러오기" }));

    const account = mydata.accounts[0];
    expect(screen.getByText(account.account_num_masked)).toBeInTheDocument();
    expect(screen.getByText(account.prod_name)).toBeInTheDocument();
    expect(screen.getByText("연 0.1%")).toBeInTheDocument();
  });

  it("대출이 없으면 빈 상태를 안내한다", async () => {
    const user = userEvent.setup();
    render(<MydataPanel personaId={NO_LOAN} mydata={await loadMydata(NO_LOAN)} />);

    await user.click(screen.getByRole("button", { name: "마이데이터 불러오기" }));
    await user.click(screen.getByRole("tab", { name: /대출/ }));

    expect(screen.getByText("보유한 대출이 없습니다.")).toBeInTheDocument();
  });

  it("대출이 있으면 상환방식 라벨을 보여준다", async () => {
    const user = userEvent.setup();
    render(
      <MydataPanel personaId={WITH_LOAN} mydata={await loadMydata(WITH_LOAN)} />,
    );

    await user.click(screen.getByRole("button", { name: "마이데이터 불러오기" }));
    await user.click(screen.getByRole("tab", { name: /대출/ }));

    expect(screen.getByText("원리금균등분할상환")).toBeInTheDocument();
    expect(screen.getByText("한국장학재단 일반상환 학자금대출")).toBeInTheDocument();
  });

  it("기준일 배지를 보여준다", async () => {
    const user = userEvent.setup();
    render(<MydataPanel personaId={NO_LOAN} mydata={await loadMydata(NO_LOAN)} />);

    await user.click(screen.getByRole("button", { name: "마이데이터 불러오기" }));
    expect(screen.getByText("기준일 2026.07.24")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/features/mydata/mydata-panel.test.tsx`
Expected: FAIL — `Failed to resolve import "./mydata-panel"`

- [ ] **Step 3: `src/features/mydata/account-list.tsx` 구현**

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MydataAccount } from "@/lib/contracts/persona";
import { formatYmd } from "@/lib/format/date";
import { formatRate, formatWon } from "@/lib/format/money";

export function AccountList({ accounts }: { accounts: MydataAccount[] }) {
  if (accounts.length === 0) {
    return <p className="py-6 text-muted">해당하는 계좌가 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>상품명</TableHead>
            <TableHead>계좌번호</TableHead>
            <TableHead>유형</TableHead>
            <TableHead className="text-right">잔액</TableHead>
            <TableHead className="text-right">금리</TableHead>
            <TableHead>개설일</TableHead>
            <TableHead>만기일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <TableRow key={account.account_num_masked}>
              <TableCell className="font-semibold">
                {account.prod_name}
              </TableCell>
              <TableCell className="tabular-nums">
                {account.account_num_masked}
              </TableCell>
              <TableCell>{account.account_type_label}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatWon(account.balance_amt)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatRate(account.offered_rate)}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatYmd(account.issue_date)}
              </TableCell>
              <TableCell className="tabular-nums">
                {account.exp_date ? formatYmd(account.exp_date) : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 4: `src/features/mydata/loan-list.tsx` 구현**

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MydataLoan } from "@/lib/contracts/persona";
import { formatYmd } from "@/lib/format/date";
import { formatRate, formatWon } from "@/lib/format/money";

export function LoanList({ loans }: { loans: MydataLoan[] }) {
  if (loans.length === 0) {
    return <p className="py-6 text-muted">보유한 대출이 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>상품명</TableHead>
            <TableHead>계좌번호</TableHead>
            <TableHead className="text-right">잔액</TableHead>
            <TableHead className="text-right">최초 원금</TableHead>
            <TableHead className="text-right">금리</TableHead>
            <TableHead>상환방식</TableHead>
            <TableHead>만기일</TableHead>
            <TableHead>다음 상환일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loans.map((loan) => (
            <TableRow key={loan.account_num_masked}>
              <TableCell className="font-semibold">{loan.prod_name}</TableCell>
              <TableCell className="tabular-nums">
                {loan.account_num_masked}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatWon(loan.balance_amt)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatWon(loan.loan_principal)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatRate(loan.last_offered_rate)}
              </TableCell>
              <TableCell>{loan.repay_method_label}</TableCell>
              <TableCell className="tabular-nums">
                {formatYmd(loan.exp_date)}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatYmd(loan.next_repay_date)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 5: `src/features/mydata/mydata-panel.tsx` 구현**

거래내역 탭은 Task 11에서 붙인다.

```tsx
"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Mydata } from "@/lib/contracts/persona";
import { formatYmd } from "@/lib/format/date";
import { formatWon } from "@/lib/format/money";

import { AccountList } from "./account-list";
import { LoanList } from "./loan-list";

export function MydataPanel({
  personaId,
  mydata,
}: {
  personaId: string;
  mydata: Mydata;
}) {
  const [loaded, setLoaded] = useState(false);

  const demand = mydata.accounts.filter(
    (account) => account.account_kind === "demand",
  );
  const savings = mydata.accounts.filter(
    (account) => account.account_kind === "savings",
  );

  if (!loaded) {
    return (
      <div className="grid gap-3 rounded-xl border border-line bg-surface p-8">
        <h2 className="text-xl font-bold">마이데이터 불러오기</h2>
        <p className="text-muted">
          동의한 금융기관의 계좌·예적금·대출·거래내역을 조회합니다.
        </p>
        <div>
          <Button type="button" onClick={() => setLoaded(true)}>
            마이데이터 불러오기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-bold">마이데이터</h2>
        <Badge variant="outline">기준일 {formatYmd(mydata.as_of)}</Badge>
        <Badge variant="outline">
          총 잔액 {formatWon(mydata.totals.total_balance)}
        </Badge>
        {mydata.totals.total_loan_balance > 0 && (
          <Badge variant="outline">
            대출 잔액 {formatWon(mydata.totals.total_loan_balance)}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="demand">
        <TabsList>
          <TabsTrigger value="demand">계좌 {demand.length}</TabsTrigger>
          <TabsTrigger value="savings">예적금 {savings.length}</TabsTrigger>
          <TabsTrigger value="loans">대출 {mydata.loans.length}</TabsTrigger>
        </TabsList>

        <TabsContent value="demand">
          <AccountList accounts={demand} />
        </TabsContent>
        <TabsContent value="savings">
          <AccountList accounts={savings} />
        </TabsContent>
        <TabsContent value="loans">
          <LoanList loans={mydata.loans} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

`personaId`는 Task 11의 거래내역 탭에서 쓴다.

- [ ] **Step 6: 테스트 통과 확인**

Run: `npx vitest run src/features/mydata/mydata-panel.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 7: `src/features/input/step-mydata.tsx` 작성**

```tsx
import type { Mydata } from "@/lib/contracts/persona";
import { MydataPanel } from "@/features/mydata/mydata-panel";

export function StepMydata({
  personaId,
  mydata,
}: {
  personaId: string;
  mydata: Mydata;
}) {
  return <MydataPanel personaId={personaId} mydata={mydata} />;
}
```

- [ ] **Step 8: `input-wizard.tsx`의 step 2 자리 교체**

import에 `import { StepMydata } from "./step-mydata";`를 추가하고, 아래 줄을

```tsx
          {step === 1 && (
            <h2 className="text-xl font-bold">마이데이터 불러오기</h2>
          )}
```

다음으로 바꾼다.

```tsx
          {step === 1 && <StepMydata personaId={personaId} mydata={mydata} />}
```

- [ ] **Step 9: 전체 검증**

```bash
npm run typecheck && npm run test && npm run build
```

Expected: 모두 PASS. `input-wizard.test.tsx`의 "다음 버튼으로 step 2로 이동한다"는 `마이데이터` 제목을 계속 찾으므로 그대로 통과한다.

- [ ] **Step 10: 커밋**

```bash
git add src/features/mydata src/features/input
git commit -m "$(cat <<'EOF'
feat(mydata): show accounts, savings and loans in step 2

계좌·예적금은 한 배열에서 account_kind로 갈라 보여주고,
대출이 없는 18명에게는 빈 상태를 안내한다. 계좌번호는 마스킹된 값만 쓴다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: step 2 — 거래내역 지연 로드와 월별 차트

**Files:**
- Create: `src/features/mydata/transaction-panel.tsx`, `src/features/mydata/transaction-panel.test.tsx`
- Create: `src/features/mydata/monthly-flow-chart.tsx`, `src/features/mydata/monthly-flow-chart.test.tsx`
- Modify: `src/features/mydata/mydata-panel.tsx` (거래내역 탭 추가)
- Modify: `package.json`

**Interfaces:**
- Consumes: `transactionsUrl()` · `transactionsSchema` · `MonthlySummary`
- Produces:
  - `TransactionPanel({ personaId, accounts }: { personaId: string; accounts: MydataAccount[] })`
  - `MonthlyFlowChart({ rows }: { rows: MonthlySummary[] })`
  - `toChartRows(rows: MonthlySummary[]): { label: string; income: number; expense: number; net: number }[]`

- [ ] **Step 1: 차트 라이브러리 설치**

```bash
npm i recharts
```

- [ ] **Step 2: `src/features/mydata/monthly-flow-chart.test.tsx` — 실패하는 테스트 작성**

jsdom에는 레이아웃이 없어 Recharts가 실제 막대를 그리지 않는다. 그래서 **데이터 변환은 순수 함수로 검증**하고, 화면에는 차트와 함께 접근성용 표를 둔다.

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { loadMydata } from "@/lib/fixtures/loader";

import { MonthlyFlowChart, toChartRows } from "./monthly-flow-chart";

const SAMPLE = "persona_e_college_student_basic";

describe("toChartRows", () => {
  it("월 라벨을 짧은 형식으로 바꾼다", () => {
    expect(
      toChartRows([
        { ym: "202607", income: 800000, expense: 700000, interest: 3360, net: 100000 },
      ]),
    ).toEqual([
      { label: "26.07", income: 800000, expense: 700000, net: 100000 },
    ]);
  });

  it("소득이 없는 달도 0으로 남긴다", () => {
    const rows = toChartRows([
      { ym: "202508", income: 0, expense: 700000, interest: 0, net: -700000 },
    ]);

    expect(rows[0].income).toBe(0);
    expect(rows).toHaveLength(1);
  });
});

describe("MonthlyFlowChart", () => {
  it("월별 표를 함께 보여준다", async () => {
    const mydata = await loadMydata(SAMPLE);
    render(<MonthlyFlowChart rows={mydata.monthly_summary} />);

    expect(
      screen.getByRole("table", { name: "월별 입출금 합계" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(
      mydata.monthly_summary.length + 1,
    );
  });

  it("집계 출처를 밝힌다", async () => {
    const mydata = await loadMydata(SAMPLE);
    render(<MonthlyFlowChart rows={mydata.monthly_summary} />);

    expect(
      screen.getByText(/거래내역 단순 합계입니다/),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `npx vitest run src/features/mydata/monthly-flow-chart.test.tsx`
Expected: FAIL — `Failed to resolve import "./monthly-flow-chart"`

- [ ] **Step 4: `src/features/mydata/monthly-flow-chart.tsx` 구현**

```tsx
"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MonthlySummary } from "@/lib/contracts/persona";
import { formatYm, formatYmShort } from "@/lib/format/date";
import { formatWon } from "@/lib/format/money";

export type ChartRow = {
  label: string;
  income: number;
  expense: number;
  net: number;
};

export function toChartRows(rows: MonthlySummary[]): ChartRow[] {
  return rows.map((row) => ({
    label: formatYmShort(row.ym),
    income: row.income,
    expense: row.expense,
    net: row.net,
  }));
}

export function MonthlyFlowChart({ rows }: { rows: MonthlySummary[] }) {
  if (rows.length === 0) {
    return <p className="py-6 text-muted">집계할 거래내역이 없습니다.</p>;
  }

  return (
    <div className="grid gap-4">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={toChartRows(rows)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dce4de" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value: number) => `${Math.round(value / 10000)}만`}
            />
            <Tooltip formatter={(value: number) => formatWon(value)} />
            <Legend />
            <Bar dataKey="income" name="입금" fill="#256b46" />
            <Bar dataKey="expense" name="출금" fill="#b45309" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-muted">
        거래내역 단순 합계입니다. 안전소득·안전지출과는 다른 값이며 백엔드
        현금흐름 엔진이 계산합니다.
      </p>

      <div className="overflow-x-auto">
        <Table aria-label="월별 입출금 합계">
          <TableHeader>
            <TableRow>
              <TableHead>월</TableHead>
              <TableHead className="text-right">입금</TableHead>
              <TableHead className="text-right">출금</TableHead>
              <TableHead className="text-right">이자</TableHead>
              <TableHead className="text-right">순증감</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.ym}>
                <TableCell>{formatYm(row.ym)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatWon(row.income)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatWon(row.expense)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatWon(row.interest)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatWon(row.net)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run src/features/mydata/monthly-flow-chart.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 6: `src/features/mydata/transaction-panel.test.tsx` — 실패하는 테스트 작성**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { loadMydata } from "@/lib/fixtures/loader";

import { TransactionPanel } from "./transaction-panel";

const SAMPLE = "persona_e_college_student_basic";

const payload = {
  persona_id: SAMPLE,
  accounts: {
    "4010-**-**0001": {
      trans_list: [
        {
          trans_dtime: "20260723194656",
          trans_no: "00000304",
          trans_type: "02",
          trans_type_label: "출금",
          trans_class: "체크카드",
          trans_amt: 25500,
          balance_amt: 1000000,
          trans_memo: "서점",
        },
      ],
    },
  },
  source: { generator: "generate_all.py", as_of: "2026-07-24" },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TransactionPanel", () => {
  it("탭이 열릴 때 한 번만 가져온다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
    vi.stubGlobal("fetch", fetchMock);

    const mydata = await loadMydata(SAMPLE);
    const { rerender } = render(
      <TransactionPanel personaId={SAMPLE} accounts={mydata.accounts} />,
    );

    await waitFor(() => expect(screen.getByText("서점")).toBeInTheDocument());

    rerender(<TransactionPanel personaId={SAMPLE} accounts={mydata.accounts} />);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `/fixtures/${SAMPLE}/transactions.json`,
    );
  });

  it("거래 구분 라벨과 금액을 보여준다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => payload }),
    );

    const mydata = await loadMydata(SAMPLE);
    render(<TransactionPanel personaId={SAMPLE} accounts={mydata.accounts} />);

    await waitFor(() => expect(screen.getByText("출금")).toBeInTheDocument());
    expect(screen.getByText("25,500원")).toBeInTheDocument();
    expect(screen.getByText("체크카드")).toBeInTheDocument();
  });

  it("계약을 어긴 응답은 오류로 알린다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ persona_id: SAMPLE }),
      }),
    );

    const mydata = await loadMydata(SAMPLE);
    render(<TransactionPanel personaId={SAMPLE} accounts={mydata.accounts} />);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "거래내역을 불러오지 못했습니다",
      ),
    );
  });

  it("거래내역이 없는 계좌만 있으면 안내한다", async () => {
    vi.stubGlobal("fetch", vi.fn());

    render(<TransactionPanel personaId={SAMPLE} accounts={[]} />);

    expect(
      screen.getByText("거래내역이 있는 계좌가 없습니다."),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: 테스트가 실패하는지 확인**

Run: `npx vitest run src/features/mydata/transaction-panel.test.tsx`
Expected: FAIL — `Failed to resolve import "./transaction-panel"`

- [ ] **Step 8: `src/features/mydata/transaction-panel.tsx` 구현**

```tsx
"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type MydataAccount,
  type Transactions,
  transactionsSchema,
} from "@/lib/contracts/persona";
import { transactionsUrl } from "@/lib/fixtures/loader";
import { formatWon } from "@/lib/format/money";

const PAGE_SIZE = 50;

function formatTransDtime(value: string): string {
  return `${value.slice(0, 4)}.${value.slice(4, 6)}.${value.slice(6, 8)} ${value.slice(8, 10)}:${value.slice(10, 12)}`;
}

export function TransactionPanel({
  personaId,
  accounts,
}: {
  personaId: string;
  accounts: MydataAccount[];
}) {
  const withTransactions = accounts.filter(
    (account) => account.has_transactions,
  );
  const [data, setData] = useState<Transactions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    if (withTransactions.length === 0) return;

    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(transactionsUrl(personaId));
        if (!response.ok) throw new Error(String(response.status));
        const parsed = transactionsSchema.parse(await response.json());
        if (!cancelled) setData(parsed);
      } catch {
        if (!cancelled) setError("거래내역을 불러오지 못했습니다.");
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [personaId, withTransactions.length]);

  if (withTransactions.length === 0) {
    return <p className="py-6 text-muted">거래내역이 있는 계좌가 없습니다.</p>;
  }

  if (error) {
    return (
      <p className="py-6 font-semibold text-red-700" role="alert">
        {error}
      </p>
    );
  }

  if (!data) {
    return <p className="py-6 text-muted">거래내역을 불러오는 중입니다…</p>;
  }

  const rows = withTransactions.flatMap(
    (account) => data.accounts[account.account_num_masked]?.trans_list ?? [],
  );

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">
        전체 {rows.length.toLocaleString("ko-KR")}건 중 {Math.min(visible, rows.length)}건
      </p>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>거래일시</TableHead>
              <TableHead>구분</TableHead>
              <TableHead>수단</TableHead>
              <TableHead>적요</TableHead>
              <TableHead className="text-right">금액</TableHead>
              <TableHead className="text-right">잔액</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, visible).map((trans) => (
              <TableRow key={`${trans.trans_dtime}-${trans.trans_no}`}>
                <TableCell className="tabular-nums">
                  {formatTransDtime(trans.trans_dtime)}
                </TableCell>
                <TableCell>{trans.trans_type_label}</TableCell>
                <TableCell>{trans.trans_class}</TableCell>
                <TableCell>{trans.trans_memo}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatWon(trans.trans_amt)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatWon(trans.balance_amt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {visible < rows.length && (
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setVisible((current) => current + PAGE_SIZE)}
          >
            더 보기
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 9: 테스트 통과 확인**

Run: `npx vitest run src/features/mydata/transaction-panel.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 10: `mydata-panel.tsx`에 거래내역 탭 추가**

import 두 줄을 추가한다.

```tsx
import { MonthlyFlowChart } from "./monthly-flow-chart";
import { TransactionPanel } from "./transaction-panel";
```

`TabsList`에 트리거 한 줄을 추가한다.

```tsx
          <TabsTrigger value="transactions">거래내역</TabsTrigger>
```

`</Tabs>` 앞에 콘텐츠를 추가한다.

```tsx
        <TabsContent value="transactions">
          <div className="grid gap-8">
            <MonthlyFlowChart rows={mydata.monthly_summary} />
            <TransactionPanel personaId={personaId} accounts={mydata.accounts} />
          </div>
        </TabsContent>
```

- [ ] **Step 11: 전체 검증**

```bash
npm run typecheck && npm run test && npm run build
```

Expected: 모두 PASS.

`npm run dev`로 `http://localhost:3000/input?persona=persona_e_college_student_basic`에서 step 2 → 마이데이터 불러오기 → 거래내역 탭을 열어 차트와 표가 보이는지, 네트워크 탭에서 `transactions.json`이 **탭을 열 때** 요청되는지 확인한다.

- [ ] **Step 12: 커밋**

```bash
git add package.json package-lock.json src/features/mydata
git commit -m "$(cat <<'EOF'
feat(mydata): add lazy transaction table and monthly flow chart

1인당 약 90KB인 거래내역을 서버 페이로드에 싣지 않고 탭을 열 때 받는다.
월별 합계는 안전소득·안전지출과 다른 값이라는 점을 화면에 밝힌다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: step 3 — 목표설정과 결과 이동

**Files:**
- Create: `src/features/input/step-goal.tsx`
- Modify: `src/features/input/input-wizard.tsx` (step 3 자리 교체 + 결과 이동)
- Modify: `src/features/input/input-wizard.test.tsx` (라우터 목 추가 + 케이스 추가)

**Interfaces:**
- Consumes: `changedFields()` · `useRouter()` · shadcn `Input`/`Button`
- Produces: `StepGoal({ profile }: { profile: PersonaProfile })`

- [ ] **Step 1: `src/features/input/step-goal.tsx` 작성**

위험 성향은 값이 늘어날 수 있으므로, 알려진 3개에 더해 **현재 값이 목록에 없으면 그 값도 옵션으로 넣는다**.

```tsx
"use client";

import { useFormContext } from "react-hook-form";

import { Input } from "@/components/ui/input";
import type { PersonaProfile } from "@/lib/contracts/persona";
import {
  liquidityPreferenceLabel,
  riskPreferenceLabel,
} from "@/lib/format/codes";
import { formatKoreanUnit } from "@/lib/format/money";

import { FieldRow, ReadonlyRow } from "./field-row";
import type { InputFormValues } from "./form-schema";

const RISK_OPTIONS = ["stability", "balanced", "aggressive"];

export function StepGoal({ profile }: { profile: PersonaProfile }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<InputFormValues>();

  const options = RISK_OPTIONS.includes(profile.goal.risk_preference)
    ? RISK_OPTIONS
    : [...RISK_OPTIONS, profile.goal.risk_preference];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="grid gap-4">
        <h3 className="text-sm font-bold text-muted">목표</h3>

        <FieldRow
          label="목표 보증금 (원)"
          htmlFor="target_price"
          hint={formatKoreanUnit(profile.goal.target_price)}
          error={errors.target_price?.message}
        >
          <Input id="target_price" type="number" {...register("target_price")} />
        </FieldRow>

        <FieldRow
          label="목표 월세 (원)"
          htmlFor="target_monthly_rent"
          error={errors.target_monthly_rent?.message}
        >
          <Input
            id="target_monthly_rent"
            type="number"
            {...register("target_monthly_rent")}
          />
        </FieldRow>

        <FieldRow
          label="목표 관리비 (원)"
          htmlFor="target_management_fee"
          error={errors.target_management_fee?.message}
        >
          <Input
            id="target_management_fee"
            type="number"
            {...register("target_management_fee")}
          />
        </FieldRow>

        <FieldRow
          label="목표 시점 (YYYYMM)"
          htmlFor="target_move_in_ym"
          error={errors.target_move_in_ym?.message}
        >
          <Input
            id="target_move_in_ym"
            inputMode="numeric"
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

      <div className="grid gap-4">
        <h3 className="text-sm font-bold text-muted">저축 계획</h3>

        <FieldRow
          label="월 저축 예산 (원)"
          htmlFor="monthly_savings_budget"
          hint={formatKoreanUnit(profile.savings.monthly_savings_budget)}
          error={errors.monthly_savings_budget?.message}
        >
          <Input
            id="monthly_savings_budget"
            type="number"
            {...register("monthly_savings_budget")}
          />
        </FieldRow>

        <FieldRow
          label="일시 예치금 (원)"
          htmlFor="lump_sum_budget"
          hint={formatKoreanUnit(profile.savings.lump_sum_budget)}
          error={errors.lump_sum_budget?.message}
        >
          <Input
            id="lump_sum_budget"
            type="number"
            {...register("lump_sum_budget")}
          />
        </FieldRow>

        <FieldRow
          label="비상 예비금 (원)"
          htmlFor="emergency_reserve"
          hint={formatKoreanUnit(profile.savings.emergency_reserve)}
          error={errors.emergency_reserve?.message}
        >
          <Input
            id="emergency_reserve"
            type="number"
            {...register("emergency_reserve")}
          />
        </FieldRow>

        <div>
          <ReadonlyRow
            label="유동성 선호"
            value={liquidityPreferenceLabel(profile.savings.liquidity_preference)}
          />
          <ReadonlyRow
            label="원금 손실 감수"
            value={profile.savings.accepts_principal_risk ? "예" : "아니오"}
          />
          <ReadonlyRow
            label="자금 필요 시점"
            value={profile.savings.fund_needed_date}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `input-wizard.test.tsx`에 라우터 목과 케이스 추가**

파일 맨 위 import 아래에 목을 넣고, `describe` 안에 케이스 2개를 추가한다.

```tsx
const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  redirect: vi.fn(),
}));
```

`vi`를 `vitest` import에 추가하고(`import { beforeEach, describe, expect, it, vi } from "vitest";`), `describe` 안에 다음을 넣는다.

```tsx
  beforeEach(() => {
    push.mockClear();
  });

  it("step 3에서 결과 보기를 누르면 대시보드로 이동한다", async () => {
    const user = userEvent.setup();
    await renderWizard();

    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.click(screen.getByRole("button", { name: "결과 보기" }));

    expect(push).toHaveBeenCalledWith(`/dashboard?persona=${SAMPLE}`);
  });

  it("값을 바꾸면 edited 표시를 붙여 이동한다", async () => {
    const user = userEvent.setup();
    await renderWizard();

    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.click(screen.getByRole("button", { name: "다음" }));

    const target = screen.getByLabelText("목표 보증금 (원)");
    await user.clear(target);
    await user.type(target, "9000000");
    await user.click(screen.getByRole("button", { name: "결과 보기" }));

    expect(push).toHaveBeenCalledWith(`/dashboard?persona=${SAMPLE}&edited=1`);
  });
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `npx vitest run src/features/input/input-wizard.test.tsx`
Expected: FAIL — `Unable to find an accessible element with the role "button" and name "결과 보기"`

- [ ] **Step 4: `input-wizard.tsx` 수정**

`next/navigation`과 `StepGoal` import를 추가한다.

```tsx
import { useRouter } from "next/navigation";

import { StepGoal } from "./step-goal";
```

그리고 **기존** `./form-schema` import에 `changedFields`를 끼워 넣는다 (같은 모듈을 두 번 import하지 않는다).

```tsx
import {
  type InputFormValues,
  changedFields,
  inputFormSchema,
  toFormValues,
} from "./form-schema";
```

컴포넌트 안 `const [step, setStep] = useState(0);` 아래에 라우터를 추가한다.

```tsx
  const router = useRouter();
```

step 3 자리를 교체한다.

```tsx
          {step === 2 && <StepGoal profile={profile} />}
```

`goNext` 아래에 제출 핸들러를 추가한다.

```tsx
  const onSubmit = form.handleSubmit((values) => {
    const edited = changedFields(defaultValues, values).length > 0;
    router.push(
      `/dashboard?persona=${personaId}${edited ? "&edited=1" : ""}`,
    );
  });
```

버튼 영역에 마지막 단계 버튼을 추가한다.

```tsx
            {step === STEP_TITLES.length - 1 && (
              <Button type="button" onClick={onSubmit}>
                결과 보기
              </Button>
            )}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run src/features/input/input-wizard.test.tsx`
Expected: PASS (7 tests)

- [ ] **Step 6: 전체 검증과 커밋**

```bash
npm run typecheck && npm run test && npm run build
git add src/features/input
git commit -m "$(cat <<'EOF'
feat(input): add goal step and dashboard hand-off

목표·저축예산을 편집 가능하게 두되, 페르소나 기준값에서 벗어나면
edited 표시를 붙여 결과 화면이 그 사실을 밝히도록 한다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: 결과 화면 (포트폴리오 상태 3분기)

**Files:**
- Create: `src/features/dashboard/portfolio-view.tsx`, `src/features/dashboard/portfolio-view.test.tsx`
- Create: `src/features/dashboard/portfolio-summary.tsx`
- Create: `src/features/dashboard/allocation-table.tsx`
- Create: `src/features/dashboard/portfolio-status-notice.tsx`
- Modify: `src/app/dashboard/page.tsx` (placeholder 제거)

**Interfaces:**
- Consumes: `loadResult()` · `requirePersonaId()` · 포맷터 · shadcn `Card`/`Table`/`Badge`
- Produces: `PortfolioView({ result, edited }: { result: PortfolioResult; edited: boolean })`

- [ ] **Step 1: `src/features/dashboard/portfolio-view.test.tsx` — 실패하는 테스트 작성**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { loadResult } from "@/lib/fixtures/loader";

import { PortfolioView } from "./portfolio-view";

const COMPLETE = "persona_e_college_student_basic";
const INFEASIBLE = "persona_m_college_student_09_affluent";
const NO_ALLOCATION = "persona_u_college_student_17_poor";

describe("PortfolioView — COMPLETE", () => {
  it("배분된 상품명과 점수를 보여준다", async () => {
    const result = await loadResult(COMPLETE);
    render(<PortfolioView result={result} edited={false} />);

    expect(screen.getByText(result.allocations[0].product_name)).toBeInTheDocument();
    expect(screen.getByText("85.54")).toBeInTheDocument();
  });

  it("긴 소수 금액을 포맷해서 보여준다", async () => {
    render(<PortfolioView result={await loadResult(COMPLETE)} edited={false} />);

    expect(screen.getByText("277만 4,194원")).toBeInTheDocument();
    expect(screen.queryByText(/2774194\.2/)).not.toBeInTheDocument();
  });

  it("정책 통과 배지를 보여준다", async () => {
    render(<PortfolioView result={await loadResult(COMPLETE)} edited={false} />);
    expect(screen.getByText("정책 통과")).toBeInTheDocument();
  });
});

describe("PortfolioView — INFEASIBLE", () => {
  it("배분 사유를 그대로 보여준다", async () => {
    render(<PortfolioView result={await loadResult(INFEASIBLE)} edited={false} />);

    expect(
      screen.getByText(/예금자보호 제약을 만족하는 조합이 없습니다/),
    ).toBeInTheDocument();
  });

  it("정책 상태가 UNKNOWN이므로 통과 배지를 보여주지 않는다", async () => {
    render(<PortfolioView result={await loadResult(INFEASIBLE)} edited={false} />);
    expect(screen.queryByText("정책 통과")).not.toBeInTheDocument();
  });

  it("배분표를 그리지 않는다", async () => {
    render(<PortfolioView result={await loadResult(INFEASIBLE)} edited={false} />);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("PortfolioView — NO_ALLOCATION_REQUIRED", () => {
  it("추가 저축이 필요 없다는 사유를 보여준다", async () => {
    render(
      <PortfolioView result={await loadResult(NO_ALLOCATION)} edited={false} />,
    );

    expect(
      screen.getByText(/월 적립액과 일시예치금이 모두 0원입니다/),
    ).toBeInTheDocument();
  });
});

describe("PortfolioView — 편집 안내", () => {
  it("edited면 안내 문구를 띄운다", async () => {
    render(<PortfolioView result={await loadResult(COMPLETE)} edited />);

    expect(
      screen.getByText(/현재 결과는 페르소나 기준값 기준입니다/),
    ).toBeInTheDocument();
  });

  it("edited가 아니면 안내가 없다", async () => {
    render(<PortfolioView result={await loadResult(COMPLETE)} edited={false} />);

    expect(
      screen.queryByText(/현재 결과는 페르소나 기준값 기준입니다/),
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/features/dashboard/portfolio-view.test.tsx`
Expected: FAIL — `Failed to resolve import "./portfolio-view"`

- [ ] **Step 3: `src/features/dashboard/portfolio-summary.tsx` 구현**

```tsx
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortfolioResult } from "@/lib/contracts/result";
import { formatKoreanUnit, toNumber } from "@/lib/format/money";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

export function PortfolioSummary({ result }: { result: PortfolioResult }) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {result.final_policy_status === "PASS" && (
          <Badge variant="outline">정책 통과</Badge>
        )}
        <Badge variant="outline">기준일 {result.source.as_of}</Badge>
        <Badge variant="outline">
          목표 달성률 {Math.round(toNumber(result.coverage_ratio) * 100)}%
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="월 배분액"
          value={formatKoreanUnit(result.monthly_allocated)}
        />
        <Metric
          label="일시 예치액"
          value={formatKoreanUnit(result.lump_sum_allocated)}
        />
        <Metric
          label="만기 예상 수령액"
          value={formatKoreanUnit(result.expected_maturity_amount)}
        />
        <Metric
          label="예상 세후 이자"
          value={formatKoreanUnit(result.expected_net_interest)}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `src/features/dashboard/allocation-table.tsx` 구현**

```tsx
"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Allocation } from "@/lib/contracts/result";
import { formatKoreanUnit, formatScore, toNumber } from "@/lib/format/money";

const COLORS = ["#256b46", "#7aa88f", "#b45309", "#617068"];

export function AllocationTable({
  allocations,
}: {
  allocations: Allocation[];
}) {
  const chartData = allocations.map((allocation) => ({
    name: allocation.product_name,
    value: toNumber(allocation.expected_maturity_amount),
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60}>
              {chartData.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatKoreanUnit(value)} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <Table aria-label="예적금 배분 결과">
          <TableHeader>
            <TableRow>
              <TableHead>상품명</TableHead>
              <TableHead className="text-right">배분액</TableHead>
              <TableHead className="text-right">기간</TableHead>
              <TableHead>만기일</TableHead>
              <TableHead className="text-right">만기 수령액</TableHead>
              <TableHead className="text-right">세후 이자</TableHead>
              <TableHead className="text-right">점수</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.map((allocation) => (
              <TableRow key={allocation.product_name}>
                <TableCell className="font-semibold">
                  {allocation.product_name}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatKoreanUnit(allocation.allocation_amount)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {allocation.term_months}개월
                </TableCell>
                <TableCell className="tabular-nums">
                  {allocation.maturity_date}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatKoreanUnit(allocation.expected_maturity_amount)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatKoreanUnit(allocation.expected_net_interest)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatScore(allocation.product_score)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: `src/features/dashboard/portfolio-status-notice.tsx` 구현**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortfolioResult } from "@/lib/contracts/result";
import { formatKoreanUnit } from "@/lib/format/money";

const TITLES = {
  INFEASIBLE: "조건을 만족하는 배분 조합이 없습니다",
  NO_ALLOCATION_REQUIRED: "배분할 저축액이 없습니다",
} as const;

export function PortfolioStatusNotice({
  result,
}: {
  result: PortfolioResult;
}) {
  const title =
    result.status === "INFEASIBLE"
      ? TITLES.INFEASIBLE
      : TITLES.NO_ALLOCATION_REQUIRED;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ul className="grid gap-1">
          {result.reasons.map((reason) => (
            <li className="text-muted" key={reason}>
              {reason}
            </li>
          ))}
        </ul>

        <dl className="grid gap-2 border-t border-line pt-4 text-sm sm:grid-cols-2">
          <Row
            label="월 저축 예산"
            value={formatKoreanUnit(result.input.monthly_savings_budget)}
          />
          <Row
            label="일시 예치 예산"
            value={formatKoreanUnit(result.input.lump_sum_budget)}
          />
          <Row
            label="검토한 상품 조합"
            value={`${result.evaluation.ELIGIBLE + result.evaluation.INELIGIBLE}건`}
          />
          <Row label="자금 필요 시점" value={result.input.fund_needed_date} />
        </dl>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
```

- [ ] **Step 6: `src/features/dashboard/portfolio-view.tsx` 구현**

```tsx
import type { PortfolioResult } from "@/lib/contracts/result";
import { categoryLabel } from "@/lib/format/codes";

import { AllocationTable } from "./allocation-table";
import { PortfolioStatusNotice } from "./portfolio-status-notice";
import { PortfolioSummary } from "./portfolio-summary";

export function PortfolioView({
  result,
  edited,
}: {
  result: PortfolioResult;
  edited: boolean;
}) {
  return (
    <section className="grid gap-6 py-12">
      <div>
        <p className="m-0 font-bold text-accent">
          {result.display_name} · {categoryLabel(result.category)}
        </p>
        <h1 className="text-3xl font-bold tracking-[-0.04em]">
          예적금 포트폴리오
        </h1>
      </div>

      {edited && (
        <p className="rounded-xl border border-line bg-accent-soft p-4 text-sm">
          변경한 목표값은 백엔드 시뮬레이션 연동 후 반영됩니다. 현재 결과는
          페르소나 기준값 기준입니다.
        </p>
      )}

      {result.status === "COMPLETE" ? (
        <>
          <PortfolioSummary result={result} />
          <AllocationTable allocations={result.allocations} />
        </>
      ) : (
        <PortfolioStatusNotice result={result} />
      )}
    </section>
  );
}
```

- [ ] **Step 7: 테스트 통과 확인**

Run: `npx vitest run src/features/dashboard/portfolio-view.test.tsx`
Expected: PASS (9 tests)

- [ ] **Step 8: `src/app/dashboard/page.tsx` 교체**

```tsx
import { PortfolioView } from "@/features/dashboard/portfolio-view";
import { requirePersonaId } from "@/lib/fixtures/guard";
import { loadResult } from "@/lib/fixtures/loader";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ persona?: string | string[]; edited?: string }>;
}) {
  const params = await searchParams;
  const personaId = requirePersonaId(params.persona);
  const result = await loadResult(personaId);

  return (
    <main>
      <PortfolioView result={result} edited={params.edited === "1"} />
    </main>
  );
}
```

- [ ] **Step 9: 전체 검증과 커밋**

```bash
npm run typecheck && npm run test && npm run build
```

`npm run dev`로 세 가지를 확인한 뒤 종료한다.
1. `?persona=persona_e_college_student_basic` → 배분표 2건과 도넛
2. `?persona=persona_m_college_student_09_affluent` → 사유 안내, 정책 통과 배지 **없음**
3. `?persona=persona_u_college_student_17_poor` → 배분 불필요 안내

```bash
git add src/features/dashboard src/app/dashboard
git commit -m "$(cat <<'EOF'
feat(dashboard): render portfolio result by status

배분이 없는 6명은 사유를 그대로 보여준다. INFEASIBLE 3명은 정책 상태가
UNKNOWN이라 통과 배지를 띄우지 않는다 — 통과로 오독되면 안 된다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: CI 반영과 완료 기준 확인

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `src/app/report/page.tsx` (2차 범위임을 명시)
- Create: `README` 갱신 대신 `docs/superpowers/plans/`에 기록 없음 — 코드만 수정

**Interfaces:**
- Consumes: Task 1~13 전부
- Produces: CI가 테스트를 실행한다.

- [ ] **Step 1: CI에 테스트 단계 추가**

`.github/workflows/ci.yml`의 `Run type check` 단계 **아래**에 다음을 넣는다.

```yaml
      - name: Run tests
        run: npm run test
```

- [ ] **Step 2: `src/app/report/page.tsx` 문구 교체**

```tsx
import { PlaceholderPage } from "@/components/ui/placeholder-page";

export default function ReportPage() {
  return (
    <PlaceholderPage
      eyebrow="REPORT"
      title="실행 보고서"
      description="전략 비교·스트레스 테스트를 포함한 보고서는 2차 범위입니다. 백엔드 현금흐름·전략비교 엔진이 완성된 뒤 연결합니다."
    />
  );
}
```

- [ ] **Step 3: 완료 기준을 하나씩 확인**

```bash
npm run typecheck && npm run test && npm run build
```

Expected: 3개 명령 모두 PASS, 테스트 실패 0.

이어서 `npm run dev`로 스펙 §7의 완료 기준을 순서대로 확인한다.

| 완료 기준 | 확인 방법 |
|---|---|
| 20명 선택 → 프리필 | `/personas`에서 카드 클릭 → step 1 값이 채워져 있다 |
| 마이데이터 불러오기 → 4탭 | step 2 버튼 클릭 → 계좌·예적금·대출·거래내역 |
| COMPLETE 14명 실제 수치 | `?persona=persona_e_...` 배분표에 상품명·점수 |
| 배분 0건 6명 | `persona_m`(사유), `persona_u`(배분 불필요), 정책 통과 배지 없음 |
| 문자열 금액·점수 포맷 | 화면 어디에도 `.2000000` · `85.5406…`이 없다 |
| 없는 persona 리다이렉트 | `?persona=persona_a_social_starter` → `/personas` |
| 백엔드 없이 동작 | 백엔드를 켜지 않은 상태에서 위 전부 통과 |

- [ ] **Step 4: 최종 커밋**

```bash
git add .github/workflows/ci.yml src/app/report/page.tsx
git commit -m "$(cat <<'EOF'
ci: run tests in pipeline and mark report as phase two

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: 스펙에 남은 합의 항목을 팀에 전달**

스펙 §9의 5개 항목은 코드로 해결되지 않는다. 구현이 끝난 시점에 역할 1·3에게 전달한다. 특히 **§9-5(상품별 점수·탈락사유 출력)** 는 2차 범위의 전제 조건이다.

---

## 남은 위험

| 항목 | 영향 | 대응 |
|---|---|---|
| shadcn CLI가 Tailwind v4 + Next 16에서 실패 | Task 3이 막힌다 | Task 3 Step 1의 수동 대체 경로를 따른다 |
| 동적 `import()`가 webpack 컨텍스트를 못 만든다 | Task 7 로더가 빌드에서 깨진다 | 경로가 리터럴 접두사(`../../mocks/fixtures/`)로 시작하는지 확인. 그래도 안 되면 20개 정적 import 맵으로 대체 |
| core 데이터가 바뀌어 스크립트가 던진다 | Task 6 재실행 실패 | 예외 메시지에 계좌 유형·페르소나 id가 찍히므로 스펙 §8의 "a~d 복귀 시 필요한 것"을 참고해 매핑을 넓힌다 |
| Recharts가 jsdom에서 막대를 안 그린다 | 차트 회귀를 테스트로 못 잡는다 | 데이터 변환은 순수 함수로, 값 표시는 접근성 표로 검증한다 (Task 11) |

