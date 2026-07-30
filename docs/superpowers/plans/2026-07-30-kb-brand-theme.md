# KB 브랜드 테마 적용 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프로토타입의 녹색 UI를 KB금융그룹 노랑·갈색 팔레트로 교체하고 KB 마스코트 캐릭터를 메인 히어로에 배치한다.

**Architecture:** `globals.css`의 브랜드 토큰을 재지정하는 것이 변경의 축이다. 텍스트 역할(`--color-accent` = KB 브라운)과 채움 역할(`--color-brand` = KB 옐로)을 분리해, 대비 미달 색이 텍스트에 흘러들 수 없게 만든다. 차트 색은 하드코딩을 걷어내고 검증된 값을 단일 모듈(`src/lib/theme/chart-colors.ts`)로 모은다. 캐릭터는 알파 처리한 PNG를 `public/`에 두고 경로 문자열로 참조한다.

**Tech Stack:** Next.js 16.2.11 (App Router) · Tailwind CSS v4 (`@theme`) · shadcn (Base UI) · Recharts 3 · Vitest + Testing Library · TypeScript

## Global Constraints

- 설계 근거 문서: `docs/superpowers/specs/2026-07-30-kb-brand-theme-design.md` (커밋 `6ae35b1`)
- 브랜드 옐로 `#ffcc00`은 **채움 전용**이다. 흰 배경 대비 1.51:1이므로 텍스트·아이콘·얇은 선에 절대 쓰지 않는다. `text-brand` 클래스는 만들지도, 쓰지도 않는다.
- 옐로 위 텍스트는 항상 `text-brand-ink`(`#3d3730`, 7.77:1)를 쓴다. `text-white`(1.51:1)를 쓰지 않는다.
- `@theme` 블록에 `--color-muted`를 **추가하지 않는다.** shadcn의 밝은 표면 토큰과 충돌해 탭·버튼 hover·Badge·Table 표면이 어두워진 회귀 이력이 있다 (`src/app/globals.test.ts` 주석 참조).
- 프로젝트 `@theme` 블록은 `globals.css`에서 **textually 마지막**에 있어야 한다. shadcn의 `@theme inline`과 `--color-background`·`--color-accent` 키가 겹치고, Tailwind v4는 마지막 선언이 이긴다.
- `.dark` 블록과 `--sidebar-*` 토큰은 건드리지 않는다. 다크모드 토글이 없고 사이드바 컴포넌트가 없다.
- 차트 색상은 `src/lib/theme/chart-colors.ts`에서만 정의한다. 컴포넌트에 hex를 하드코딩하지 않는다.
- 커밋은 태스크 단위로 하고, 브랜치는 현재 `feature/frontend-prototype`을 유지한다.
- 각 태스크 종료 시 `npm test`가 통과해야 한다.

---

## File Structure

| 파일 | 책임 | 작업 |
|---|---|---|
| `public/character/kb-star.png` | 알파 처리된 캐릭터 에셋 (560×556) | 생성 |
| `src/app/globals.css` | 브랜드 토큰 10개 · shadcn `:root` 토큰 · body 배경 | 수정 |
| `src/app/globals.test.ts` | 컴파일된 CSS의 토큰 해결값 검증 | 수정 |
| `src/lib/theme/chart-colors.ts` | 검증된 차트 계열색 · 순환 금지 배정 함수 | 생성 |
| `src/lib/theme/chart-colors.test.ts` | 계열색 값과 배정 규칙 고정 | 생성 |
| `src/components/ui/button.tsx` | `brand` variant 추가 | 수정 |
| `src/components/ui/ui.smoke.test.ts` | `brand` variant 존재 검증 | 수정 |
| `src/app/page.tsx` | 히어로 2단 구성 · 캐릭터 · 옐로 CTA | 수정 |
| `src/app/page.test.tsx` | 캐릭터 렌더 · 에셋 파일 존재 | 수정 |
| `src/features/dashboard/allocation-table.tsx` | 도넛 색상 · 범례 | 수정 |
| `src/features/mydata/monthly-flow-chart.tsx` | 막대 색상 · 그리드 | 수정 |
| `src/features/input/input-wizard.tsx` | 진행 CTA를 `brand` variant로 | 수정 |

`chart-colors.ts`를 새 모듈로 두는 이유: 두 차트가 같은 값을 쓰는데 현재는 각 파일에 hex가 흩어져 있다. 검증 근거(어떤 명령으로 무엇을 통과했는지)를 한 곳에 붙여둘 수 있고, 값이 테스트로 고정된다.

---

## 차트 색상 근거 (구현 전 반드시 읽을 것)

`dataviz` 스킬의 검증기를 돌려 확정한 값이다. **hex를 임의로 바꾸지 말 것** — 바꾸면 재검증이 필요하다.

설계 문서 §4.4의 잠정값 4색(`#4e473f`, `#ffcc00`, `#8c6d3f`, `#d9cdb8`)은 **검증에서 탈락**했다: 명도 밴드 이탈(`#4e473f` 0.402 / `#ffcc00` 0.865, 허용 0.43–0.77), 채도 하한 미달(브라운·탠이 회색으로 읽힘). 확정값은 다음이다.

```
node scripts/validate_palette.js "#eda100,#8a4b12" --mode light --surface "#faf7f1"
  [PASS] Lightness band      all 2 inside L 0.43–0.77
  [PASS] Chroma floor        all 2 >= 0.1
  [PASS] CVD separation      ΔE 28.9 (protan) · 28.2 (tritan)
  [PASS] Normal-vision floor ΔE 29.3 (normal)
  [WARN] Contrast vs surface #eda100 at 2.02:1 — 완화 채널 필요
```

- `#eda100` = KB 옐로와 같은 색상 계열에서 명도만 밴드 안으로 내린 단계다. UI의 `--color-brand`(`#ffcc00`)를 차트 마크에 그대로 쓸 수 없어서 필요하다.
- `#8a4b12` = KB 브라운 계열에서 채도를 하한 위로 올린 단계다. `#4e473f`는 채도 0.016으로 회색으로 읽혀 계열 식별에 쓸 수 없다.
- 대비 WARN은 **완화 조건으로 해소된다**: 두 차트 모두 범례가 있고 바로 옆에 전체 데이터 표가 있다. 이 완화 채널을 제거하면 안 된다 — 범례나 표를 지우는 변경은 이 WARN을 실제 실패로 바꾼다.
- 픽스처 20개를 확인한 결과 `allocations` 길이는 0·1·2뿐이다(각 6·6·8건). 기존 4색 배열과 `% COLORS.length` 순환은 과설계이며, 순환 배정은 계열 식별을 깨는 안티패턴이다. 계열 2개 + "기타" 중성색으로 대체한다.

**설계 문서와의 편차 1건:** §4.3은 shadcn `--chart-1`~`-5` 재지정을 지시했으나 **건드리지 않는다.** 이 토큰을 읽는 컴포넌트가 없고(shadcn chart 컴포넌트 미설치), 검증되지 않은 5슬롯 팔레트를 남기는 것이 무채색 기본값을 남기는 것보다 나쁘다. 대신 주석으로 `chart-colors.ts`를 가리킨다.

---

## Task 1: 캐릭터 에셋 생성

**Files:**
- Create: `public/character/kb-star.png`
- Test: `src/app/page.test.tsx` (파일 존재 검증만 추가. 렌더 검증은 Task 6)

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces: `public/character/kb-star.png` — 560×556 RGBA PNG. Task 6이 `/character/kb-star.png` 경로로 `width={560} height={556}`로 참조한다.

원본 이미지는 대화 첨부 파일이며 저장소에 없다. 아래 스크립트가 이미 알파 처리·크롭까지 완료한 결과물을 스크래치패드에 만들어 두었다면 그것을 복사하고, 없으면 스크립트를 다시 실행한다. 원본 경로: `/private/tmp/claude-501/-Users-programming-housing-finance-system/88ce919c-0e2f-4a94-a421-c3674f5b6ead/scratchpad/character.png` (654×602, 불투명 흰 배경).

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/app/page.test.tsx`의 import에 추가:

```tsx
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
```

`describe("HomePage", ...)` 블록 안에 추가:

```tsx
  // 캐릭터는 public 경로 문자열로 참조하므로 파일이 없어도 타입체크·렌더가
  // 통과하고 런타임 404로만 드러난다. 파일 자체를 테스트로 붙잡는다.
  it("캐릭터 이미지 파일이 public에 있다", () => {
    const assetPath = fileURLToPath(
      new URL("../../public/character/kb-star.png", import.meta.url),
    );

    expect(existsSync(assetPath)).toBe(true);
  });
```

- [ ] **Step 2: 테스트가 실패하는 것을 확인한다**

Run: `npm test -- src/app/page.test.tsx`
Expected: FAIL — `expected false to be true` (파일 없음)

- [ ] **Step 3: 에셋을 생성한다**

스크래치패드에 `make-character.py`로 저장하고 실행한다. 순수 표준 라이브러리만 쓴다(sharp/PIL 불필요).

핵심 두 가지: **테두리에서 시작하는 flood fill**이라 돋보기 렌즈와 태블릿 화면의 흰색이 보존되고, 하단 여백은 0이라 캐릭터 발이 잘리지 않는다.

```python
import zlib, struct, pathlib
from collections import deque

SRC = "/private/tmp/claude-501/-Users-programming-housing-finance-system/88ce919c-0e2f-4a94-a421-c3674f5b6ead/scratchpad/character.png"
DST = "/Users/programming/housing-finance-system/housing-finance-web/public/character/kb-star.png"
PAD = 8          # 좌·상·우 여백
NEAR_WHITE = 242 # 각 채널이 이 값 이상이면 배경 후보

data = pathlib.Path(SRC).read_bytes()
pos, idat = 8, b""
while pos < len(data):
    ln = struct.unpack(">I", data[pos:pos + 4])[0]
    typ = data[pos + 4:pos + 8]
    chunk = data[pos + 8:pos + 8 + ln]
    if typ == b"IHDR":
        w, h, _bd, ct = struct.unpack(">IIBB", chunk[:10])
        assert ct == 6, "RGBA 원본을 기대한다"
    if typ == b"IDAT":
        idat += chunk
    pos += 12 + ln

raw = zlib.decompress(idat)
n, stride = 4, w * 4
prev, rows, i = bytearray(stride), [], 0
for _y in range(h):
    ft = raw[i]; i += 1
    line = bytearray(raw[i:i + stride]); i += stride
    for x in range(stride):
        a = line[x - n] if x >= n else 0
        b = prev[x]
        c = prev[x - n] if x >= n else 0
        if ft == 1: line[x] = (line[x] + a) & 255
        elif ft == 2: line[x] = (line[x] + b) & 255
        elif ft == 3: line[x] = (line[x] + (a + b) // 2) & 255
        elif ft == 4:
            p = a + b - c
            pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
            line[x] = (line[x] + (a if (pa <= pb and pa <= pc) else (b if pb <= pc else c))) & 255
    rows.append(line); prev = line

def near_white(x, y):
    o = x * n
    return rows[y][o] >= NEAR_WHITE and rows[y][o + 1] >= NEAR_WHITE and rows[y][o + 2] >= NEAR_WHITE

seen = bytearray(w * h)
q = deque()
for x in range(w):
    for y in (0, h - 1):
        if near_white(x, y) and not seen[y * w + x]:
            seen[y * w + x] = 1; q.append((x, y))
for y in range(h):
    for x in (0, w - 1):
        if near_white(x, y) and not seen[y * w + x]:
            seen[y * w + x] = 1; q.append((x, y))
cleared = 0
while q:
    x, y = q.popleft()
    rows[y][x * n + 3] = 0; cleared += 1
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nx, ny = x + dx, y + dy
        if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and near_white(nx, ny):
            seen[ny * w + nx] = 1; q.append((nx, ny))

minx, miny, maxx, maxy = w, h, 0, 0
for y in range(h):
    r = rows[y]
    for x in range(w):
        if r[x * n + 3] > 8:
            minx, maxx = min(minx, x), max(maxx, x)
            miny, maxy = min(miny, y), max(maxy, y)

x0, x1 = max(0, minx - PAD), min(w, maxx + 1 + PAD)
y0 = max(0, miny - PAD)
y1 = h if maxy >= h - 2 else min(h, maxy + 1 + PAD)  # 발이 하단에 닿으면 아래는 자르지 않는다
cw, chh = x1 - x0, y1 - y0

out = bytearray()
for y in range(y0, y1):
    out += b"\x00" + bytes(rows[y][x0 * n:x1 * n])

def chunk_bytes(t, d):
    return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)

png = (b"\x89PNG\r\n\x1a\n"
       + chunk_bytes(b"IHDR", struct.pack(">IIBBBBB", cw, chh, 8, 6, 0, 0, 0))
       + chunk_bytes(b"IDAT", zlib.compress(bytes(out), 9))
       + chunk_bytes(b"IEND", b""))

dst = pathlib.Path(DST)
dst.parent.mkdir(parents=True, exist_ok=True)
dst.write_bytes(png)
print(f"투명화 {cleared}px · bbox {minx},{miny}-{maxx},{maxy} · 출력 {cw}x{chh} · {len(png)}B")
```

Run: `python3 make-character.py`
Expected: `투명화 209707px · bbox 82,54-625,601 · 출력 560x556 · …B`

- [ ] **Step 4: 테스트가 통과하는 것을 확인한다**

Run: `npm test -- src/app/page.test.tsx`
Expected: PASS (4개 테스트)

- [ ] **Step 5: 결과물을 눈으로 확인한다**

Read 도구로 `public/character/kb-star.png`를 열어 확인한다:
- 캐릭터 외곽에 흰 테두리(halo)가 없다
- 돋보기 렌즈 안쪽과 태블릿 화면의 흰색이 **남아 있다** (flood fill이 내부까지 들어가면 실패)
- 발이 잘리지 않았다

- [ ] **Step 6: 커밋**

```bash
git add public/character/kb-star.png src/app/page.test.tsx
git commit -m "feat(theme): KB 캐릭터 에셋을 알파 처리해 추가

원본은 알파가 아닌 불투명 흰 배경이라 컬러 배경 위에서 흰 사각형이
보인다. 테두리 flood fill로 배경만 투명화해 렌즈·태블릿 내부 흰색은
보존했다. 경로 문자열 참조라 파일 누락이 런타임 404로만 드러나므로
존재 검증 테스트를 함께 붙였다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: 브랜드 토큰 재지정

**Files:**
- Modify: `src/app/globals.css:157-165` (프로젝트 `@theme` 블록)
- Test: `src/app/globals.test.ts:36-44` (`EXPECTED_TOKENS`)

**Interfaces:**
- Consumes: 없음
- Produces: Tailwind 유틸리티 `bg-brand`, `bg-brand-strong`, `text-brand-ink`, `border-brand-strong`, 그리고 재지정된 `text-accent`(브라운), `bg-accent-soft`(옐로 틴트), `border-line`, `text-brand-muted`, `bg-background`, `bg-surface`. Task 4·6이 이 클래스를 쓴다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/app/globals.test.ts`의 `EXPECTED_TOKENS`를 통째로 교체한다. 값 옆 주석은 측정한 대비다.

```ts
const EXPECTED_TOKENS: Record<string, string> = {
  "--color-background": "#faf7f1",
  "--color-surface": "#ffffff",
  "--color-text": "#26221c", // 배경 대비 14.79:1
  "--color-brand-muted": "#6b6259", // 배경 대비 5.58:1
  "--color-line": "#e7e0d4",
  "--color-accent": "#4e473f", // KB 브라운. 흰 배경 9.14:1
  "--color-accent-soft": "#fff6d9",
  // 옐로는 채움 전용이다. 흰 배경 1.51:1이라 텍스트에 쓸 수 없다.
  "--color-brand": "#ffcc00",
  "--color-brand-strong": "#f5b800",
  "--color-brand-ink": "#3d3730", // 옐로 위 7.77:1
};
```

- [ ] **Step 2: 테스트가 실패하는 것을 확인한다**

Run: `npm test -- src/app/globals.test.ts`
Expected: FAIL — 기존 7개는 옛 녹색값(`#256b46` 등)이 나와서 불일치, 신규 3개는 `[]`(선언 없음)로 불일치

- [ ] **Step 3: `@theme` 블록을 구현한다**

`globals.css` 마지막 `@theme` 블록을 교체한다. **블록 위치를 옮기지 말 것** — 파일 마지막이어야 shadcn 블록과의 키 충돌에서 이긴다. 기존 주석은 유지하고 아래 내용을 덧붙인다.

```css
/* Task 2 project theme tokens. Declared after shadcn's generated blocks
   above so these values win where keys overlap (--color-background,
   --color-accent). --color-muted is intentionally NOT declared here: it
   collides with shadcn's surface token (bg-muted, used by TabsList,
   Button's outline/ghost hover, Badge, Card footer, Table). The project's
   text color lives under --color-brand-muted instead, used via
   text-brand-muted. See globals.test.ts for the regression test.

   KB금융그룹 팔레트. kbstar.com·kbland.kr의 실제 CSS에서 추출했다
   (#ffcc00은 양쪽 공통, 브라운은 #4e473f/#4c4a3f).

   역할 분리가 핵심이다: --color-accent(브라운)는 텍스트·강조,
   --color-brand(옐로)는 채움 전용이다. 옐로는 흰 배경 대비 1.51:1이라
   텍스트로 쓸 수 없어서, 겸용 토큰 하나로 두면 text-accent를 쓰는
   6곳이 동시에 읽히지 않게 된다. 옐로 위 텍스트는 --color-brand-ink. */
@theme {
  --color-background: #faf7f1;
  --color-surface: #ffffff;
  --color-text: #26221c;
  --color-brand-muted: #6b6259;
  --color-line: #e7e0d4;
  --color-accent: #4e473f;
  --color-accent-soft: #fff6d9;
  --color-brand: #ffcc00;
  --color-brand-strong: #f5b800;
  --color-brand-ink: #3d3730;
}
```

- [ ] **Step 4: 테스트가 통과하는 것을 확인한다**

Run: `npm test -- src/app/globals.test.ts`
Expected: PASS — 토큰 10개 각각 1건씩 해결되고, `--color-muted` 가드도 통과

- [ ] **Step 5: 커밋**

```bash
git add src/app/globals.css src/app/globals.test.ts
git commit -m "feat(theme): 브랜드 토큰을 KB 노랑·갈색으로 재지정

accent를 브라운(텍스트 역할)으로 두고 옐로를 --color-brand로
신설해 채움 전용으로 분리했다. 옐로는 흰 배경 대비 1.51:1이라
텍스트 겸용 토큰으로 둘 수 없다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: shadcn `:root` 토큰과 body 배경

**Files:**
- Modify: `src/app/globals.css:7-41` (`:root`), `src/app/globals.css:43-54` (`body`)
- Test: `src/app/globals.test.ts`

`:root`의 shadcn 토큰은 Button·Badge·Table·Tabs·Input·Card가 실제로 참조한다. 값 표기를 `oklch()`에서 hex로 바꾼다 — 측정값이 전부 hex라 추적이 쉽고, 같은 파일의 프로젝트 블록과 표기가 통일된다.

**`--primary`는 옐로가 아니라 브라운이다.** `bg-primary`뿐 아니라 `text-primary`에도 쓰이기 때문이다(`button.tsx:20` link variant, `badge.tsx`). 옐로로 두면 그 두 곳이 1.51:1이 된다. `--ring`도 같은 이유로 브라운이다(포커스 링은 인접색 대비 3:1 필요).

`--accent`·`--accent-foreground`는 건드리지 않는다. 프로젝트 `@theme` 블록이 `--color-accent`를 직접 선언해 이기므로 유틸리티에 영향이 없는 사실상 사문 토큰이다.

**Interfaces:**
- Consumes: Task 2의 팔레트 값 (`#4e473f`, `#e7e0d4`, `#6b6259`)
- Produces: `bg-primary`/`text-primary`(브라운), `bg-muted`/`bg-secondary`(웜 표면), `border-border`, `ring`. Task 5의 wizard 버튼이 `default` variant로 이 값을 쓴다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/app/globals.test.ts` 맨 아래에 새 `describe`를 추가한다. `.dark` 블록이 같은 키를 다시 선언하므로 값이 2건 나온다 — 첫 번째(라이트)만 검증한다.

```ts
describe("shadcn :root 토큰이 KB 계열로 재지정된다", () => {
  // .dark 블록이 같은 키를 다시 선언하므로 컴파일 결과에 2건이 나온다.
  // 라이트 모드 선언이 먼저 오므로 [0]을 본다. .dark는 범위 밖이다.
  it.each([
    ["--primary", "#4e473f"], // 옐로가 아니다: text-primary(link 버튼·badge)가 1.51:1이 된다
    ["--ring", "#4e473f"], // 포커스 링은 인접색 대비 3:1이 필요하다
    ["--border", "#e7e0d4"],
    ["--input", "#e7e0d4"],
  ])("%s는 %s로 해결된다", async (token, expected) => {
    const compiled = await compileGlobalsCss();

    expect(resolvedValuesFor(compiled, token)[0]).toBe(expected);
  });

  it("body 배경 글로우가 녹색이 아니라 KB 옐로다", async () => {
    const compiled = await compileGlobalsCss();

    expect(compiled).toContain("rgba(255, 204, 0, 0.22)");
    expect(compiled).not.toContain("rgba(37, 107, 70");
  });
});
```

- [ ] **Step 2: 테스트가 실패하는 것을 확인한다**

Run: `npm test -- src/app/globals.test.ts`
Expected: FAIL — `--primary`가 `oklch(0.205 0 0)`, body에 `rgba(37, 107, 70, 0.12)`가 남아 있음

- [ ] **Step 3: `:root`와 `body`를 구현한다**

`:root` 안에서 아래 8개 선언만 교체한다. 나머지(`--background`, `--foreground`, `--card`, `--popover`, `--destructive`, `--radius`, `--sidebar-*`, `--chart-*`)는 그대로 둔다.

```css
  --primary: #4e473f;
  --primary-foreground: #ffffff;
  --secondary: #f2ede4;
  --secondary-foreground: #4e473f;
  --muted: #f4efe7;
  --muted-foreground: #6b6259;
  --border: #e7e0d4;
  --input: #e7e0d4;
  --ring: #4e473f;
```

`--chart-1`~`-5` 바로 위에 주석을 추가한다(값은 그대로):

```css
  /* 이 프로젝트의 차트는 src/lib/theme/chart-colors.ts를 쓴다. shadcn
     chart 컴포넌트가 없어 아래 토큰을 읽는 곳이 없으므로, 검증하지 않은
     5슬롯 브랜드 팔레트를 남기지 않고 기본값을 둔다. */
```

`body`의 그라디언트 색을 교체한다:

```css
body {
  margin: 0;
  color: var(--color-text);
  background:
    radial-gradient(
      circle at top right,
      rgba(255, 204, 0, 0.22),
      transparent 28rem
    ),
    var(--color-background);
  font-family: Arial, Helvetica, sans-serif;
}
```

- [ ] **Step 4: 테스트가 통과하는 것을 확인한다**

Run: `npm test -- src/app/globals.test.ts`
Expected: PASS (기존 8건 + 신규 5건)

- [ ] **Step 5: 커밋**

```bash
git add src/app/globals.css src/app/globals.test.ts
git commit -m "feat(theme): shadcn 표면·주요색 토큰을 KB 계열로 맞춤

primary와 ring은 옐로가 아니라 브라운으로 둔다. text-primary를
쓰는 link 버튼과 badge가 옐로에서 1.51:1이 되고, 포커스 링은
인접색 대비 3:1이 필요하다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: Button `brand` variant

**Files:**
- Modify: `src/components/ui/button.tsx:10-21` (`variants.variant`)
- Modify: `src/features/input/input-wizard.tsx:115,120`
- Test: `src/components/ui/ui.smoke.test.ts`

**Interfaces:**
- Consumes: Task 2의 `bg-brand`, `bg-brand-strong`, `text-brand-ink`
- Produces: `<Button variant="brand">` — 진행형 CTA용 KB 옐로 버튼. `buttonVariants({ variant: "brand" })`가 `bg-brand text-brand-ink hover:bg-brand-strong`을 포함한다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/components/ui/ui.smoke.test.ts`에 추가한다. import 문에 `buttonVariants`가 필요하다.

```ts
import { buttonVariants } from "./button";

describe("brand 버튼 variant", () => {
  it("옐로 채움에 브라운 글자를 쓴다", () => {
    const classes = buttonVariants({ variant: "brand" });

    expect(classes).toContain("bg-brand");
    expect(classes).toContain("text-brand-ink");
    expect(classes).toContain("hover:bg-brand-strong");
  });

  it("옐로 위에 흰 글자를 쓰지 않는다", () => {
    // #ffcc00 위의 흰 글자는 1.51:1이다. text-brand-ink(#3d3730)는 7.77:1.
    expect(buttonVariants({ variant: "brand" })).not.toContain("text-white");
  });
});
```

- [ ] **Step 2: 테스트가 실패하는 것을 확인한다**

Run: `npm test -- src/components/ui/ui.smoke.test.ts`
Expected: FAIL — 타입 에러 또는 `bg-brand`가 클래스 문자열에 없음

- [ ] **Step 3: variant를 구현한다**

`button.tsx`의 `variant` 객체에서 `default` 바로 아래에 추가한다. 기존 variant는 건드리지 않는다.

```ts
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        // KB 옐로 CTA. 옐로 위 글자는 반드시 text-brand-ink다 —
        // text-white는 1.51:1, text-brand-ink는 7.77:1.
        brand: "bg-brand text-brand-ink hover:bg-brand-strong",
```

- [ ] **Step 4: 진행 CTA에 적용한다**

`input-wizard.tsx`에서 앞으로 나아가는 버튼 2개에만 `variant="brand"`를 준다. `이전`(outline)은 그대로 둔다.

```tsx
            {step < STEP_TITLES.length - 1 && (
              <Button type="button" variant="brand" onClick={goNext}>
                다음
              </Button>
            )}
            {step === STEP_TITLES.length - 1 && (
              <Button type="button" variant="brand" onClick={onSubmit}>
                결과 보기
              </Button>
            )}
```

`persona-grid.tsx`의 필터 칩은 `default`(브라운)를 유지한다 — 선택 상태 표시이고 CTA가 아니다.

- [ ] **Step 5: 테스트가 통과하는 것을 확인한다**

Run: `npm test`
Expected: PASS — 신규 2건 포함 전체 통과. `input-wizard.test.tsx`가 버튼을 이름으로 찾으므로 variant 변경에 영향받지 않는다.

- [ ] **Step 6: 커밋**

```bash
git add src/components/ui/button.tsx src/components/ui/ui.smoke.test.ts src/features/input/input-wizard.tsx
git commit -m "feat(theme): 옐로 CTA용 brand 버튼 variant 추가

위저드의 다음·결과 보기에 적용했다. 옐로 위 글자는 text-white
(1.51:1)가 아니라 text-brand-ink(7.77:1)를 쓴다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: 차트 팔레트 모듈과 두 차트 적용

**Files:**
- Create: `src/lib/theme/chart-colors.ts`
- Create: `src/lib/theme/chart-colors.test.ts`
- Modify: `src/features/dashboard/allocation-table.tsx:17,34-38`
- Modify: `src/features/mydata/monthly-flow-chart.tsx:52,66-67`

구현 전 이 문서의 "차트 색상 근거" 절을 읽을 것. hex를 임의로 바꾸면 재검증이 필요하다.

**Interfaces:**
- Consumes: 없음 (독립 모듈)
- Produces:
  - `CHART_SERIES: readonly ["#eda100", "#8a4b12"]`
  - `CHART_OTHER: "#8c857a"`
  - `CHART_GRID: "#e7e0d4"`
  - `CHART_SURFACE: "#ffffff"`
  - `seriesColor(index: number): string` — 인덱스 0·1은 계열색, 2 이상은 `CHART_OTHER`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/lib/theme/chart-colors.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  CHART_GRID,
  CHART_OTHER,
  CHART_SERIES,
  CHART_SURFACE,
  seriesColor,
} from "./chart-colors";

describe("차트 계열 색상", () => {
  // 검증기를 통과한 값이다. 바꾸려면 재검증이 필요하다:
  // node scripts/validate_palette.js "#eda100,#8a4b12" --mode light --surface "#faf7f1"
  it("검증된 2개 값으로 고정된다", () => {
    expect(CHART_SERIES).toEqual(["#eda100", "#8a4b12"]);
  });

  it("계열이 2개를 넘으면 브랜드 색을 순환하지 않고 중성색으로 떨어진다", () => {
    expect(seriesColor(0)).toBe("#eda100");
    expect(seriesColor(1)).toBe("#8a4b12");
    expect(seriesColor(2)).toBe(CHART_OTHER);
    expect(seriesColor(7)).toBe(CHART_OTHER);
  });

  it("그리드는 본문 구분선과 같은 값이라 뒤로 물러난다", () => {
    expect(CHART_GRID).toBe("#e7e0d4");
  });

  it("마크 사이 간격은 표면색과 같다", () => {
    expect(CHART_SURFACE).toBe("#ffffff");
  });
});
```

- [ ] **Step 2: 테스트가 실패하는 것을 확인한다**

Run: `npm test -- src/lib/theme/chart-colors.test.ts`
Expected: FAIL — `Failed to resolve import "./chart-colors"`

- [ ] **Step 3: 모듈을 구현한다**

`src/lib/theme/chart-colors.ts`:

```ts
/**
 * 차트 계열 색상. KB 옐로·브라운 계열 안에서 6개 검사를 통과한 값이다.
 *
 *   node scripts/validate_palette.js "#eda100,#8a4b12" \
 *     --mode light --surface "#faf7f1"
 *
 *   명도 밴드 PASS (L 0.43~0.77) · 채도 하한 PASS (C >= 0.1)
 *   CVD 분리 PASS (ΔE 28.9 protan / 28.2 tritan)
 *   정상시야 하한 PASS (ΔE 29.3) · 표면 대비 WARN (#eda100 2.02:1)
 *
 * UI의 --color-brand(#ffcc00)를 그대로 쓰지 않는 이유: 명도 0.865로
 * 밴드 위에 있고 표면 대비 1.41:1이라 차트 마크로 못 쓴다. #eda100은
 * 같은 색상 계열에서 명도만 밴드 안으로 내린 단계다. 같은 이유로
 * KB 브라운 #4e473f는 채도 0.016(회색으로 읽힘)이라 계열 식별에 쓸 수
 * 없어서, 채도를 하한 위로 올린 #8a4b12를 쓴다.
 *
 * 대비 WARN은 완화 조건으로 해소된다 — 두 차트 모두 범례가 있고 바로
 * 옆에 전체 데이터 표가 있다. 범례나 표를 지우면 WARN이 실제 실패가 된다.
 */
export const CHART_SERIES = ["#eda100", "#8a4b12"] as const;

/**
 * 계열이 2개를 넘을 때 쓰는 "기타" 중성색. 브랜드 색을 순환시키지
 * 않는다 — 순환 배정은 색이 가리키는 대상을 바꿔버려 식별을 깬다.
 * 픽스처 20개에서 allocations 길이는 0·1·2뿐이라 실제로는 쓰이지
 * 않지만, 백엔드가 3개 이상을 주더라도 색이 겹치지 않게 둔다.
 */
export const CHART_OTHER = "#8c857a";

/** 그리드·축처럼 뒤로 물러나야 하는 선. --color-line과 같은 값. */
export const CHART_GRID = "#e7e0d4";

/**
 * 마크 사이를 벌리는 표면색. --color-surface와 같은 값이다. 인접한 채움
 * 사이에 2px 표면색 간격을 두면 두 계열이 맞닿아 섞여 보이지 않는다.
 */
export const CHART_SURFACE = "#ffffff";

export function seriesColor(index: number): string {
  return CHART_SERIES[index] ?? CHART_OTHER;
}
```

- [ ] **Step 4: 테스트가 통과하는 것을 확인한다**

Run: `npm test -- src/lib/theme/chart-colors.test.ts`
Expected: PASS (3건)

- [ ] **Step 5: 월별 입출금 차트에 적용한다**

`monthly-flow-chart.tsx`의 import에 추가:

```tsx
import { CHART_GRID, seriesColor } from "@/lib/theme/chart-colors";
```

3줄을 교체한다:

```tsx
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
```

```tsx
            <Bar dataKey="income" name="입금" fill={seriesColor(0)} />
            <Bar dataKey="expense" name="출금" fill={seriesColor(1)} />
```

`<Legend />`는 이미 있다 — **지우지 말 것.** 대비 WARN의 완화 채널이다.

- [ ] **Step 6: 배분 도넛에 적용한다**

`allocation-table.tsx`에서 `COLORS` 상수(17행)를 **삭제**하고 import를 추가한다:

```tsx
import { CHART_SURFACE, seriesColor } from "@/lib/theme/chart-colors";
```

`Legend`를 recharts import에 추가한다:

```tsx
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
```

차트 부분을 교체한다. 변경 3가지: 색상을 `seriesColor`로, 조각 사이 2px 간격(`paddingAngle` + 표면색 `stroke`), 그리고 **범례 추가** — 지금은 조각과 상품명을 잇는 단서가 hover 툴팁뿐이라 식별이 색에만 의존한다.

```tsx
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              paddingAngle={2}
              stroke={CHART_SURFACE}
              strokeWidth={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={entry.name} fill={seriesColor(index)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) =>
                typeof value === "number" || typeof value === "string"
                  ? formatKoreanUnit(value)
                  : value
              }
            />
            <Legend />
          </PieChart>
```

- [ ] **Step 7: 전체 테스트를 돌린다**

Run: `npm test`
Expected: PASS — `portfolio-view.test.tsx`와 `monthly-flow-chart.test.tsx`가 텍스트·표 기준이라 색상 변경에 영향받지 않는다.

- [ ] **Step 8: 커밋**

```bash
git add src/lib/theme/chart-colors.ts src/lib/theme/chart-colors.test.ts src/features/dashboard/allocation-table.tsx src/features/mydata/monthly-flow-chart.tsx
git commit -m "feat(theme): 차트 색상을 검증된 KB 계열 2색으로 통일

설계 문서의 잠정 4색은 명도 밴드·채도 하한 검사에서 탈락했다.
같은 KB 계열에서 명도·채도를 조정한 #eda100/#8a4b12가 6개 검사를
통과한다. 픽스처의 allocations는 최대 2개이므로 4색 순환 배정도
함께 걷어냈다 — 순환은 색이 가리키는 대상을 바꿔 식별을 깬다.
도넛에는 범례를 추가했다(식별이 색에만 의존하고 있었다).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: 메인 히어로와 캐릭터

**Files:**
- Modify: `src/app/page.tsx:28-49` (히어로 `section`)
- Test: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: Task 1의 `public/character/kb-star.png` (560×556), Task 2의 `bg-brand`/`text-brand-ink`/`border-brand-strong`
- Produces: 없음 (최종 화면)

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/app/page.test.tsx`의 `describe("HomePage", ...)`에 추가한다.

```tsx
  it("메인 화면에 KB 캐릭터를 보여준다", () => {
    render(<HomePage />);

    expect(screen.getByAltText("KB 부동산 캐릭터")).toBeInTheDocument();
  });

  it("시작 버튼은 옐로 위에 흰 글자를 쓰지 않는다", () => {
    render(<HomePage />);

    // #ffcc00 위의 흰 글자는 1.51:1이다. text-brand-ink(#3d3730)는 7.77:1.
    const cta = screen.getByRole("link", { name: "금융 라이프 컨설팅 받기" });

    expect(cta.className).toContain("bg-brand");
    expect(cta.className).toContain("text-brand-ink");
    expect(cta.className).not.toContain("text-white");
  });
```

- [ ] **Step 2: 테스트가 실패하는 것을 확인한다**

Run: `npm test -- src/app/page.test.tsx`
Expected: FAIL — `Unable to find an element with the alt text: KB 부동산 캐릭터`

- [ ] **Step 3: 히어로를 구현한다**

`page.tsx` 상단 import에 추가:

```tsx
import Image from "next/image";
```

히어로 `section`(28~49행)을 교체한다. 텍스트 열과 이미지 열을 2단으로 나누고, 모바일에서는 캐릭터가 헤드라인 위로 온다(`order-1`).

```tsx
      <section className="grid items-center gap-8 pt-16 pb-16 md:grid-cols-2 md:pt-24">
        <div className="order-2 grid gap-6 md:order-1">
          <p className="m-0 font-bold text-accent">
            HOUSING FINANCE CONSULTING
          </p>
          <h1 className="m-0 max-w-[760px] text-[clamp(40px,7vw,72px)] font-bold leading-[1.05] tracking-[-0.06em]">
            내 금융 흐름으로 계산하는 주택 매매 자금 로드맵
          </h1>
          <p className="m-0 max-w-[680px] text-lg leading-[1.7] text-brand-muted">
            단순한 금리 비교가 아니라 비상자금, 저축여력, 목표 시점을 함께
            계산합니다.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-brand-strong bg-brand px-5 font-bold text-brand-ink transition-colors hover:bg-brand-strong"
              href={`/input?persona=${entryPersona.persona_id}`}
            >
              금융 라이프 컨설팅 받기
            </Link>
          </div>
        </div>

        <div className="order-1 flex justify-center md:order-2 md:justify-end">
          <div className="relative flex aspect-square w-40 items-center justify-center md:w-[320px]">
            {/* 캐릭터 몸통이 옐로라 솔리드 옐로 배경에서는 분리가 약하다.
                부드러운 글로우로 브랜드색을 깔고 캐릭터는 띄운다. */}
            <div
              aria-hidden
              className="absolute inset-0 rounded-full bg-[radial-gradient(circle,var(--color-brand)_0%,transparent_70%)] opacity-60"
            />
            <Image
              alt="KB 부동산 캐릭터"
              className="relative h-auto w-full"
              height={556}
              priority
              src="/character/kb-star.png"
              width={560}
            />
          </div>
        </div>
      </section>
```

아래 서비스 흐름 `section`은 건드리지 않는다 — `text-accent`(스텝 번호)가 Task 2에서 브라운으로 이미 바뀌었다.

- [ ] **Step 4: 테스트가 통과하는 것을 확인한다**

Run: `npm test -- src/app/page.test.tsx`
Expected: PASS (6건)

- [ ] **Step 5: 실제 화면을 확인한다**

Run: `npm run dev` 후 `http://localhost:3000`

확인 항목:
- 캐릭터 뒤에 흰 사각형이 보이지 않는다
- 데스크톱에서 헤드라인 왼쪽 / 캐릭터 오른쪽 2단
- 창을 좁히면 캐릭터가 헤드라인 위로 올라간다
- CTA가 옐로 채움 + 브라운 글자이고, hover에서 더 진한 옐로가 된다

- [ ] **Step 6: 커밋**

```bash
git add src/app/page.tsx src/app/page.test.tsx
git commit -m "feat(home): 히어로를 2단으로 바꾸고 KB 캐릭터 배치

CTA는 옐로 채움 + 브라운 글자(6.05:1)다. 모바일에서는 캐릭터가
헤드라인 위로 온다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: 잔존 색상 검증과 최종 확인

**Files:** 없음 (검증 전용. 잔존 색이 발견되면 해당 파일 수정)

**Interfaces:**
- Consumes: Task 1~6 전부
- Produces: 없음

- [ ] **Step 1: 옛 녹색 팔레트가 남아 있지 않은지 확인한다**

`globals.test.ts`의 `#617068`은 의도된 회귀 가드이므로 테스트 파일을 제외한다.

```bash
grep -rnE '#256b46|#7aa88f|#b45309|#617068|#e1f2e8|#dce4de|#f5f7f3|#17211b|rgba\(37, ?107, ?70' \
  src --include='*.ts' --include='*.tsx' --include='*.css' | grep -v '\.test\.'
```

Expected: 출력 없음 (exit 1)

- [ ] **Step 2: 옐로 위 흰 글자가 없는지 확인한다**

```bash
grep -rnE 'bg-brand[^-]' src --include='*.tsx' | grep -v '\.test\.'
```

Expected: `page.tsx`의 CTA와 `button.tsx`의 brand variant 2건. 각 줄에 `text-brand-ink`가 함께 있어야 하고 `text-white`가 없어야 한다.

- [ ] **Step 3: 전체 테스트**

Run: `npm test`
Expected: 전체 PASS

- [ ] **Step 4: 타입체크**

Run: `npm run typecheck`
Expected: 에러 없음

- [ ] **Step 5: 프로덕션 빌드**

Run: `npm run build`
Expected: 성공. `/character/kb-star.png`가 정적 에셋으로 포함된다(Dockerfile이 `public/`을 런너로 복사한다).

- [ ] **Step 6: 화면 전체를 눈으로 확인한다**

`npm run dev`로 4개 화면을 돌아본다. 검증기는 색만 보고 레이아웃은 보지 않으므로 직접 확인이 필요하다.

| 경로 | 확인 |
|---|---|
| `/` | 캐릭터·옐로 CTA·브라운 스텝번호 |
| `/personas` | 필터 칩(선택=브라운 채움), 카드 테두리 웜 톤 |
| `/input?persona=<id>` | 탭 스트립 라벨이 읽힌다(표면 충돌 회귀 확인), 다음 버튼이 옐로 |
| `/dashboard?persona=<id>` | 도넛 2색 + 범례, 월별 막대 2색, 표 헤더 웜 표면 |

- [ ] **Step 7: 커밋 (수정이 있었을 때만)**

```bash
git add -A
git commit -m "fix(theme): 잔존 녹색 팔레트 제거

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-Review

**1. 스펙 커버리지**

| 스펙 항목 | 태스크 |
|---|---|
| §2.1-1 브랜드 토큰 7개 재지정 | Task 2 |
| §2.1-2 신규 토큰 3개 | Task 2 |
| §2.1-3 shadcn 토큰 재지정 | Task 3 |
| §2.1-4 하드코딩 차트 색상 교체 | Task 5 |
| §2.1-5 캐릭터 메인 배치 | Task 1, 6 |
| §2.1-6 테스트 갱신·가드 추가 | Task 1(에셋 존재), 2(토큰), 3(shadcn), 4(variant), 5(팔레트), 6(렌더) |
| §4.5 body 그라디언트 | Task 3 |
| §5.3 CTA | Task 6 |
| §5.4 brand variant | Task 4 |
| §6.1 완료 기준 1~6 | Task 7 |
| §2.2 비목표(`.dark`·`--sidebar-*` 유지) | Global Constraints에 명시 |

편차 1건: §4.3의 `--chart-1`~`-5` 재지정은 하지 않는다. 근거는 "차트 색상 근거" 절 마지막에 기록했다. §4.4의 잠정 4색은 검증 탈락해 2색으로 확정했다.

**2. Placeholder 스캔** — TBD·"적절히 처리"·코드 없는 지시 없음. 모든 코드 단계에 실제 코드가 있다.

**3. 타입 일관성** — `seriesColor(index: number): string`가 Task 5에서 정의되고 같은 태스크의 두 차트에서만 쓰인다. `CHART_SERIES`/`CHART_OTHER`/`CHART_GRID` 이름이 모듈·테스트·호출부에서 일치한다. `buttonVariants`는 `button.tsx`의 기존 export이며 Task 4 테스트가 그 이름으로 import한다.
