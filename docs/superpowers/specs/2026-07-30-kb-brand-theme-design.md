# KB금융그룹 브랜드 테마 적용 설계안

- 작성일: 2026-07-30
- 대상 저장소: `housing-finance-web`
- 참조 사이트: `https://www.kbstar.com/`, `https://kbland.kr/` (실제 CSS 추출)
- 선행 문서: `2026-07-28-frontend-prototype-design.md` §6 디자인 (본 문서가 팔레트 부분을 대체)

---

## 1. 배경

프로토타입의 현재 색상 체계는 녹색 계열(`--color-accent: #256b46`)이다. 이를 KB금융그룹
주요 컬러(노랑 + 갈색)로 교체하고, 제공된 KB 마스코트 캐릭터를 메인 화면에 배치한다.

### 1.1 현재 색상 체계

7개 브랜드 토큰이 `src/app/globals.css`의 마지막 `@theme` 블록에 있다. 이 블록이 파일에서
textually 마지막에 와야 shadcn의 `@theme inline` 블록과의 키 충돌(`--color-background`,
`--color-accent`)에서 승리한다. `src/app/globals.test.ts`가 실제 PostCSS 파이프라인으로
컴파일해 *해결된* 값을 검증하며 이 순서를 지킨다.

`--color-muted`는 의도적으로 브랜드 토큰이 **아니다**. shadcn이 같은 키를 밝은 표면
토큰으로 쓰기 때문(`bg-muted` — TabsList, Button outline/ghost hover, Badge, Card footer,
Table)이며, 과거 브랜드 텍스트색으로 덮었을 때 탭 라벨 대비가 약 1.9:1까지 떨어진 이력이
있다. 브랜드 보조 텍스트색은 `--color-brand-muted`(`text-brand-muted`)에 있다.

### 1.2 색상 사용처 실측

| 위치 | 사용 |
|---|---|
| `text-accent` | 6곳 — 홈 eyebrow·스텝번호, 위저드, 포트폴리오 헤더, placeholder-page |
| `bg-accent` | 1곳 — 홈 CTA (`border-accent bg-accent text-white`) |
| `bg-accent-soft` | 1곳 — 포트폴리오 편집 안내 배너 |
| `border-line` | 7곳 |
| `text-brand-muted` | 15곳 |
| 하드코딩 hex | `monthly-flow-chart.tsx:52,66,67`, `allocation-table.tsx:17` |
| shadcn oklch 토큰 | `button.tsx`(primary/secondary/muted), `badge.tsx`, `table.tsx`, `tabs.tsx`, `input.tsx`, `card.tsx` |

### 1.3 KB 브랜드 컬러 추출 결과

두 사이트의 실제 스타일시트를 받아 hex 빈도순으로 집계했다. 브랜드 가이드 추측이 아니다.

| 출처 | 파일 | 상위 브랜드 색상 |
|---|---|---|
| kbstar.com | `2018/css/intro_2018*.css` | `#ffcc00`(5) · `#4e473f`(9) · `#ffe85a`(3) · `#ffcf0f`(3) · `#897154`(2) · `#eae5df`(2) · `#e7e4e2`(2) |
| kbland.kr | `common/styles/{ui,main,layout}.css` | `#ffcc00`(38) · `#4c4a3f`(19) · `#645b4c`(16) · `#febd36`(15) |

`#FFCC00`이 양쪽 공통 브랜드 옐로이고, 브라운은 `#4E473F`(kbstar) / `#4C4A3F`(kbland)로
사실상 동일 계열이다. kbland의 청색군(`#517ad6`, `#17356e`)은 지도·마케팅 전용이므로
채택하지 않는다.

---

## 2. 목표와 비목표

### 2.1 목표

1. 기존 7개 브랜드 토큰을 KB 노랑·갈색 계열로 재지정 (`--color-surface`는 `#ffffff` 유지)
2. 노랑을 안전하게 쓰기 위한 신규 토큰 3개 추가 (역할 분리)
3. 버튼·차트·표가 실제로 참조하는 shadcn 토큰 재지정
4. 하드코딩된 차트 색상 4종 교체
5. KB 마스코트 캐릭터를 메인 화면 히어로 우측에 배치
6. 기존 대비 회귀 테스트 갱신 및 신규 가드 추가

### 2.2 비목표

- 다크모드: 토글이 없고 `.dark`가 적용되는 경로가 존재하지 않으며 값도 이미 무채색이다.
  `.dark` 블록은 손대지 않는다.
- `--sidebar-*` 토큰: 사이드바 컴포넌트가 없다. 미사용이므로 손대지 않는다.
- 레이아웃·문구·기능 변경: 히어로 2단 구성 외에는 없다.
- 폰트 변경: KB는 자체 서체(KBFG Display)를 쓰지만 웹폰트 라이선스 범위가 불명확하다.

### 2.3 브랜드 자산 사용에 관한 주의

KB 마스코트와 CI 컬러는 KB금융그룹의 자산이다. 본 적용은 내부 프로토타입·해커톤 범위를
전제하며, 외부 공개 시에는 별도 사용 승인이 필요하다. 이 문서는 그 승인을 대체하지 않는다.

---

## 3. 결정사항

### D1. accent를 텍스트 역할로 두고, 노랑은 신규 채움 토큰으로 분리한다

**KB 옐로 `#FFCC00`은 흰 배경 대비 1.51:1이다.** WCAG AA 본문 기준 4.5:1, 큰 텍스트
3:1, 비텍스트 UI 3:1 모두 미달이므로 텍스트·얇은 선·아이콘에 쓸 수 없다.

현재 `--color-accent` 하나가 텍스트(6곳)와 채움(1곳)을 겸하고 있어, 이 토큰을 노랑으로
바꾸면 6곳이 동시에 읽히지 않게 된다.

따라서 `--color-accent`는 **KB 브라운**으로 두고(기존 `text-accent` 6곳이 그대로 안전),
노랑은 `--color-brand`로 신설해 **채움에만** 쓴다. 노랑 위 텍스트는 `--color-brand-ink`를
쓴다. 대비 위반이 구조적으로 발생하지 않는 배치다.

### D1 대안 비교

| 안 | 내용 | 결과 |
|---|---|---|
| A (채택) | accent=브라운, brand=옐로 신설 | 컴포넌트 수정 최소, 대비 안전 |
| B | `--color-accent`를 `#FFCC00`으로 재지정 | 수정량 최소이나 텍스트 6곳이 1.51:1로 깨짐 → 기각 |
| C | shadcn oklch 전면 재구축 + 다크모드 | 미사용 영역까지 건드림 → YAGNI, 필요한 일부만 A에 흡수 |

### D2. shadcn `--primary`는 옐로가 아니라 브라운으로 둔다

`--primary`는 채움(`bg-primary`)뿐 아니라 텍스트(`text-primary` — `button.tsx:20` link
variant, `badge.tsx`)에도 쓰인다. 옐로로 두면 이 두 곳이 1.51:1이 된다. `--primary`는
브라운(`#4e473f`, 흰 글자 9.14:1)으로 두고, KB 특유의 옐로 버튼은 별도 `brand` variant로
**명시적으로** 선택하게 한다.

`--ring`도 같은 이유로 브라운이다. 포커스 링은 인접 색 대비 3:1이 필요하고 옐로는 미달이다.

### D3. `--color-muted`는 여전히 브랜드 토큰이 아니다

웜 톤 조정이 필요한 shadcn 표면(`--muted`, `--secondary`)은 `:root`의 shadcn 변수에서
직접 수정한다. `@theme` 블록에 `--color-muted`를 추가하면 §1.1의 충돌이 재발한다.

### D4. 캐릭터 이미지의 흰 배경을 투명화한다

제공된 PNG(654×602, RGBA)는 **알파가 아니라 불투명 흰색 배경**이다(네 꼭짓점 모두
`rgba(255,255,255,255)`). 웜 배경·글로우 위에 얹으면 흰 사각형이 보인다.

테두리에서 시작하는 flood fill로 근백색(각 채널 ≥242)만 투명화한다. 단순 임계값
치환이 아니라 flood fill이어야 하는 이유는 돋보기 렌즈 내부와 태블릿 화면의 흰색을
보존해야 하기 때문이다. 검증 결과 전체의 53.3%가 투명화되고, 남은 불투명 영역의
bounding box는 (82,54)–(625,601) = 544×548이다.

**halo 검증 완료**: 알파 처리 결과를 KB 옐로(`#ffcc00`)와 다크 브라운(`#4e473f`) 양
극단에 합성해 흰 테두리가 남지 않음을 확인했다.

### D5. `public/` 경로 문자열 + 명시적 width/height로 렌더한다

`src/` 정적 import 대신 `public/` 경로를 쓴다. 번들러 에셋 처리와 vitest의 `.png` 해석
경로를 아예 거치지 않아 테스트 리스크가 없고, 기존 `public/fixtures` 관례와 일치한다.
`sharp`가 설치되어 있고(`node_modules/sharp`) Next 16.2.11이므로 `next/image` 최적화는
동작한다. Dockerfile이 `public/`을 런너로 복사하므로 배포에도 포함된다.

---

## 4. 팔레트

### 4.1 브랜드 토큰 (globals.css 마지막 `@theme` 블록)

| 토큰 | 현재 | 변경 후 | 근거·검증 |
|---|---|---|---|
| `--color-background` | `#f5f7f3` | `#faf7f1` | 웜 오프화이트 |
| `--color-surface` | `#ffffff` | `#ffffff` | 변경 없음 |
| `--color-text` | `#17211b` | `#26221c` | 배경 대비 14.79:1 |
| `--color-brand-muted` | `#617068` | `#6b6259` | 배경 대비 5.58:1 |
| `--color-line` | `#dce4de` | `#e7e0d4` | kbstar `#eae5df`·`#e7e4e2` 계열 |
| `--color-accent` | `#256b46` | `#4e473f` | KB 브라운. 흰 배경 9.14:1 |
| `--color-accent-soft` | `#e1f2e8` | `#fff6d9` | 옐로 틴트 표면 |
| `--color-brand` | — (신규) | `#ffcc00` | KB 옐로. **채움 전용** |
| `--color-brand-strong` | — (신규) | `#f5b800` | 옐로 hover |
| `--color-brand-ink` | — (신규) | `#3d3730` | 옐로 위 텍스트. 7.77:1 |

`--color-brand`와 기존 `--color-brand-muted`는 Tailwind v4에서 별개 키로 해석되므로
`bg-brand`와 `text-brand-muted`가 충돌 없이 공존한다.

### 4.2 대비 측정값 (WCAG 2.1 상대휘도 기준)

| 조합 | 비율 | 판정 |
|---|---|---|
| `#ffcc00` on `#ffffff` | 1.51:1 | ✗ 텍스트 금지 (D1의 근거) |
| `#4e473f` on `#ffffff` | 9.14:1 | ✓ AAA |
| `#4e473f` on `#faf7f1` | 8.55:1 | ✓ AAA |
| `#4e473f` on `#ffcc00` | 6.05:1 | ✓ AA |
| `#3d3730` on `#ffcc00` | 7.77:1 | ✓ AAA |
| `#ffffff` on `#4e473f` | 9.14:1 | ✓ AAA |
| `#26221c` on `#faf7f1` | 14.79:1 | ✓ AAA |
| `#6b6259` on `#faf7f1` | 5.58:1 | ✓ AA |

`#7a7168`도 보조 텍스트 후보였으나 4.47:1로 AA 미달이라 `#6b6259`를 택했다.

### 4.3 shadcn `:root` 토큰 재지정

`oklch` 표기를 유지하되 값을 KB 계열로 바꾼다. 대상은 실제 컴포넌트가 참조하는 것만이다.

| 토큰 | 역할 | 변경 방향 |
|---|---|---|
| `--primary` | `bg-primary`, `text-primary` | KB 브라운 (D2) |
| `--primary-foreground` | 브라운 위 글자 | 흰색 유지 |
| `--secondary`, `--muted` | 밝은 표면 | 웜 톤으로 미세 조정 (중성 회백 → 웜 회백) |
| `--border`, `--input` | 경계선 | `--color-line`과 같은 웜 톤 |
| `--ring` | 포커스 링 | KB 브라운 (D2) |
| `--chart-1`~`-5` | 차트 | §4.4 램프 |
| `--destructive` | 오류 | 변경 없음 |

### 4.4 차트 색상 (검증 완료)

초안의 잠정 4색(`#4e473f`, `#ffcc00`, `#8c6d3f`, `#d9cdb8`)은 `dataviz` 검증기에서
**탈락**했다: 명도 밴드 이탈(`#4e473f` 0.402 / `#ffcc00` 0.865, 허용 0.43–0.77),
채도 하한 미달(`#4e473f` 0.016 · `#8c6d3f` 0.074 · `#d9cdb8` 0.031 — 회색으로 읽힘).
UI용 브랜드 색을 차트 마크에 그대로 쓸 수 없다는 뜻이다.

같은 KB 색상 계열에서 명도·채도만 조정해(snap-to-passing) 확정한 값:

```
node scripts/validate_palette.js "#eda100,#8a4b12" --mode light --surface "#faf7f1"
  [PASS] 명도 밴드 · [PASS] 채도 하한
  [PASS] CVD 분리 ΔE 28.9(protan) / 28.2(tritan)
  [PASS] 정상시야 하한 ΔE 29.3
  [WARN] 표면 대비 #eda100 2.02:1 — 완화 채널 필요
```

| 위치 | 현재 | 변경 |
|---|---|---|
| `allocation-table.tsx:17` `COLORS` | `#256b46`, `#7aa88f`, `#b45309`, `#617068` | 상수 삭제 → `seriesColor(index)` |
| `monthly-flow-chart.tsx:66` 입금 bar | `#256b46` | `seriesColor(0)` = `#eda100` |
| `monthly-flow-chart.tsx:67` 출금 bar | `#b45309` | `seriesColor(1)` = `#8a4b12` |
| `monthly-flow-chart.tsx:52` grid stroke | `#dce4de` | `CHART_GRID` = `#e7e0d4` |

값은 `src/lib/theme/chart-colors.ts`에 모으고 검증 근거를 주석으로 붙인다. 컴포넌트에
hex를 하드코딩하지 않는다.

**계열 수:** 픽스처 20개의 `allocations` 길이는 0·1·2뿐이다(각 6·6·8건). 기존 4색
배열과 `% COLORS.length` 순환은 과설계이고, 순환 배정은 색이 가리키는 대상을 바꿔
계열 식별을 깬다. 계열 2개 + "기타" 중성색(`#8c857a`)으로 대체한다.

**대비 WARN 완화:** 두 차트 모두 범례와 인접 데이터 표가 있어야 한다. 월별 차트는
이미 둘 다 있고, 배분 도넛은 범례가 없어 식별이 색과 hover 툴팁에만 의존하므로
`<Legend />`를 추가한다. 이 완화 채널을 제거하는 변경은 WARN을 실제 실패로 바꾼다.

**§4.3 편차:** shadcn `--chart-1`~`-5`는 재지정하지 않는다. 이 토큰을 읽는 컴포넌트가
없고(shadcn chart 컴포넌트 미설치), 검증하지 않은 5슬롯 브랜드 팔레트를 남기는 것이
무채색 기본값을 남기는 것보다 위험하다. 주석으로 `chart-colors.ts`를 가리킨다.

### 4.5 body 배경 그라디언트

`globals.css`의 `body`에 있는 `rgba(37, 107, 70, 0.12)`(녹색 radial-gradient)를 KB 옐로
틴트로 바꾼다. 위치(top right)와 반경(28rem)은 유지한다.

---

## 5. 메인 화면 캐릭터

### 5.1 에셋

- 경로: `public/character/kb-star.png`
- 처리: D4의 flood fill 알파화 → 콘텐츠 bounding box로 크롭 + 여백 8px (약 560×556)
- 원본 654×602를 320px로 표시하면 유효 밀도 약 1.75x다. 부드러운 일러스트라 육안상
  문제가 없는 수준이며, 업스케일은 하지 않는다.
- 캐릭터의 발이 원본 하단 경계에 닿아 있다(bbox가 y=601까지). 하단을 잘라내지 않도록
  크롭 시 하단 여백은 0으로 둔다.

### 5.2 히어로 구성

`src/app/page.tsx`의 첫 `section`을 2단으로 바꾼다.

```
데스크톱 (md 이상)                        모바일
┌──────────────────┬─────────────┐      ┌──────────────┐
│ HOUSING FINANCE  │   ╭─────╮   │      │  ╭────╮      │
│ CONSULTING       │   │  ★  │   │      │  │ ★  │ 160px│
│                  │   ╰─────╯   │      │  ╰────╯      │
│ 내 금융 흐름으로  │  옐로 글로우 │      │ HOUSING...   │
│ 계산하는 ...      │   최대 320px │      │ 헤드라인      │
│                  │             │      │ 본문          │
│ [옐로 CTA]       │             │      │ [옐로 CTA]    │
└──────────────────┴─────────────┘      └──────────────┘
```

- 텍스트 열과 이미지 열은 `md:grid-cols-2`. 모바일에서는 이미지가 텍스트 위로 온다.
- 캐릭터 뒤에 `--color-brand` 기반 radial glow를 둔다. 캐릭터 몸통이 옐로(`#F2C150`)라
  솔리드 옐로 배경 위에서는 분리가 약하므로, 배경은 솔리드가 아닌 부드러운 글로우로 한다.
- `alt`: `"KB 부동산 캐릭터"` — 장식이 아니라 브랜드를 전달하므로 빈 alt를 쓰지 않는다.
- `priority` 지정: 히어로 이미지이므로 LCP 대상이다.

### 5.3 CTA

```
현재:   border border-accent bg-accent px-5 font-bold text-white
변경:   border border-brand-strong bg-brand px-5 font-bold text-brand-ink
                                    hover:bg-brand-strong
```

`text-white`(옐로 위 1.51:1)가 아니라 `text-brand-ink`(7.77:1)를 쓴다.

### 5.4 Button 컴포넌트 `brand` variant

`src/components/ui/button.tsx`의 `buttonVariants`에 추가한다.

```
brand: "bg-brand text-brand-ink hover:bg-brand-strong"
```

기존 variant는 건드리지 않는다. `default`(브라운)와 `brand`(옐로)를 호출부가 선택한다.

---

## 6. 테스트

| 파일 | 작업 |
|---|---|
| `src/app/globals.test.ts` | `EXPECTED_TOKENS` 7개 값을 §4.1로 갱신 + 신규 3개(`--color-brand`, `--color-brand-strong`, `--color-brand-ink`) 추가. `--color-muted` 가드는 그대로 둔다 |
| `src/app/page.test.tsx` | 캐릭터 이미지가 `alt`로 조회되는지 어서션 추가. 기존 3개 테스트는 변경 없이 통과해야 한다 |
| 신규 (`page.test.tsx` 내) | `public/character/kb-star.png` 파일 존재 검증. 경로 문자열 참조라 파일이 없어도 컴파일·렌더가 통과하고 런타임에 404로만 드러나므로 가드가 필요하다 |

`globals.test.ts`는 실제 PostCSS로 컴파일해 해결된 값을 확인하므로, 값만 갱신하면 shadcn
블록 순서 가드는 그대로 유효하다.

### 6.1 완료 기준

1. `npm test` 통과
2. `npm run typecheck` 통과
3. `npm run build` 통과
4. 앱 화면에서 녹색(`#256b46`, `#7aa88f`, `#e1f2e8`, `#dce4de`, `#f5f7f3`) 잔존 0건
   — `grep`으로 확인
5. 메인 화면에 캐릭터가 렌더되고 흰 배경 사각형이 보이지 않음
6. §4.2의 대비 조합이 실제 구현값과 일치

---

## 7. 위험요소

| 위험 | 대응 |
|---|---|
| 노랑이 텍스트에 재유입 | `--color-brand`를 채움 전용으로 문서화(§D1). `text-brand`는 쓰지 않는다 |
| `shadcn add` 재실행이 `@theme` 블록을 브랜드 블록 아래에 삽입 | 기존 `globals.test.ts` 가드가 실패로 잡는다 |
| `--color-muted` 충돌 재발 | §D3 — `@theme`에 추가하지 않고 `:root`에서만 조정 |
| 알파 처리에서 캐릭터 내부 흰색(렌즈·태블릿) 손실 | flood fill 방식으로 이미 검증 완료(§D4) |
| 옐로 위 흰 글자 잔존 | CTA를 `text-brand-ink`로 교체(§5.3), 완료 기준 4의 grep |
| 차트 색의 계열 구분성 저하 | 검증 완료 — CVD ΔE 28.9/28.2, 정상시야 29.3 (§4.4) |
| 차트 대비 WARN 완화 채널(범례·표) 유실 | §4.4에 명시. 범례·표를 지우는 변경은 리뷰에서 막는다 |

---

## 8. 작업 순서

1. 캐릭터 에셋 처리 → `public/character/kb-star.png`
2. `globals.css` — `@theme` 브랜드 토큰 10개, `:root` shadcn 토큰, `body` 그라디언트
3. `globals.test.ts` — 기대값 갱신
4. `button.tsx` — `brand` variant 추가
5. `page.tsx` — 히어로 2단 + 캐릭터 + CTA
6. `page.test.tsx` — 캐릭터·에셋 어서션
7. 차트 색상 — `src/lib/theme/chart-colors.ts` 신설 + 2파일 적용 + 도넛 범례
8. 완료 기준 1~6 검증

구현 계획: `docs/superpowers/plans/2026-07-30-kb-brand-theme.md`
