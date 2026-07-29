# 프론트엔드 프로토타입 설계안 (역할 2)

- 작성일: 2026-07-28
- 개정: 2026-07-28 (실데이터 검증 반영 — §1.4 추가, 1차 범위를 대학생 20명으로 한정)
- 대상 저장소: `housing-finance-web`
- 참조 저장소: `housing-finance-core` (읽기 전용)
- 근거 문서: 「주택구매_금융컨설팅_개발방법_및_3인_역할분담」 v1.0

---

## 1. 배경

### 1.1 백엔드 현황

`housing-finance-core`를 조사한 결과, 역할 2가 호출할 수 있는 API가 아직 없다.

| 영역 | 상태 |
|---|---|
| 예적금 엔진 | 동작. 평가·점수화·포트폴리오 구성까지 완성 (`app/engines/savings/`) |
| 대출 엔진 | 부분. PMT·DSR 공식, 기존부채 환산, 상품·규제 한도 |
| Rule Engine | 상품팩 19종 (예적금 10 + 대출 9) |
| 현금흐름·스트레스·전략비교·추천·보고서 | **빈 스텁** (`__init__.py` 2줄) |
| `POST /api/v1/simulations` | **501 Not Implemented** |

설계안 24장의 위험요소 "프론트가 백엔드를 기다림"에 해당하는 상황이며, 대응책인 "첫날 가상 API 응답 JSON 확정"을 그대로 적용한다.

### 1.2 web 저장소 현황

커밋 2건(2026-07-23)의 스캐폴딩 상태다.

- Next.js App Router + TypeScript strict, `next dev --webpack` 고정 (Windows 한글경로 + Turbopack 이슈 회피)
- 스타일: plain CSS (`globals.css` 약 200줄, CSS 변수 정의됨)
- `zod` 설치되어 있으나 미사용
- Tailwind·UI 라이브러리·폼 라이브러리·차트 라이브러리 없음
- `/input` `/dashboard` `/report` 3개 라우트 모두 placeholder
- CI: `npm run typecheck` + `npm run build` 통과 필수

두 저장소는 `/Users/programming/housing-finance-system/` 아래에 나란히 있다.

### 1.3 페르소나 데이터 현황

`core/app/data_pipeline/mydata/`에 24명의 합성 마이데이터가 있다. **동일한 스키마가 아니며 목표 시나리오가 다르다.**

| | 페르소나 a~d (4명) | 페르소나 e~x (20명) |
|---|---|---|
| 시나리오 | 주택 **구매** | **월세 보증금** 마련 |
| `target_price` | 4.5억 ~ 11억 | 300만 ~ 8,000만 |
| `target_housing_type` | 필드 없음 | `monthly_rent` |
| 프로필 필드 수 | 14 | 32~36 |
| `monthly_income`·`monthly_average_expense` | **없음** | 있음 |
| 보유 대출 | 1~2건 | 20명 중 2명만 |
| `savings_preferences.json` | 없음 | 있음 |
| 엔진 산출 결과 | **없음** | `college_student_portfolio_results.json`에 20명 전원 존재 |

a~d의 결과를 만들려면 월 저축여력을 산출할 **현금흐름 엔진**이 필요한데 해당 모듈이 비어 있다. 즉 **현 시점에 a~d의 결과 수치는 정당하게 만들 수 없다.** 또한 a~d는 `monthly_income`·`monthly_average_expense`가 아예 없어 카드 요약조차 e~x와 같은 형태로 만들 수 없다.

따라서 **1차 범위에서 a~d를 완전히 제외한다** (D4 · §2.2). 복귀 조건은 §8에 적는다.

파일 구성(계좌 단위로 분산):

```
persona_{x}/
  user_profile.json                    설계안 6.1 사용자 입력값
  bank_001_accounts.json               계좌 목록 (진입점)
  bank_002_deposit_basic_{acct}.json   예적금 기본정보
  bank_003_deposit_detail_{acct}.json  예적금 잔액·금리
  bank_004_deposit_trans_{acct}.json   거래내역 300~470건
  bank_008_loan_basic_{acct}.json      대출 기본정보
  bank_009_loan_detail_{acct}.json     대출 잔액·원금
  savings_preferences.json             예적금 엔진 입력
  generation_metadata.json             생성 근거
```

거래 구분 코드(`mydata_design.md` 7.2):

| 코드 | 의미 |
|---|---|
| `01` | 신규 |
| `02` | 출금 — 지출 원천 |
| `03` | 입금 — 소득 원천 |
| `98` | 기타(입금) — 이자 |

실데이터 전수 조사 결과 **`02`·`03`·`98`만 존재**한다(`02` 다수, `03`은 월 1~2건, `98`은 이자). 나머지 코드에 대한 처리 규칙은 방어적으로만 둔다.

### 1.4 계좌 유형 코드 확인 결과

`account_type`은 마이데이터 표준의 4자리 계좌유형 코드 문자열이며 `bank_001_accounts.json`의 계좌마다 붙어 있다. 대학생 20명의 계좌를 전수 조사한 결과 **4종뿐**이다.

| `account_type` | 상품명 | 건수 | 분류 |
|---|---|---|---|
| `1001` | KB국민 대학생 생활통장 | 20 | 입출금 |
| `1002` | KB 가족지원 정기예금 | 6 | 예적금 |
| `1003` | KB 대학생 목표적금 | 16 | 예적금 |
| `3150` | 한국장학재단 학자금대출 | 2 | 대출 |

`bank_001_accounts.json`의 `account_list` 항목은 `account_num` · `prod_name` · `account_type` · `account_status` · `is_foreign_deposit` · `is_minus`만 가진다. **잔액·금리는 없으므로 `bank_003`에서 병합**해야 한다.

청약(`1999`) 3건 · ISA(`2003`) 1건 · 마이너스통장(`is_minus=true`) 1건은 **전부 a~d에만** 존재하므로 1차 범위에서 해당 예외처리가 불필요하다. 복귀 시 필요한 규칙은 §8에 적는다.

---

## 2. 목표와 비목표

### 2.1 목표 (1차 범위)

1. 대학생 20명 중 하나를 선택하면 설계안 6.1이 요구하는 입력값이 **입력폼에 자동 프리필**된다.
2. '마이데이터 불러오기' 버튼을 누르면 계좌·예적금·대출·거래내역이 **사용자 화면에 표시**된다.
3. 포트폴리오가 `COMPLETE`인 **14명**은 예적금 배분 결과가 **실제 엔진 산출 수치**로 표시된다.
4. 배분이 0건인 **6명**(`INFEASIBLE` 3 · `NO_ALLOCATION_REQUIRED` 3)은 그 사유와 함께 **정직하게** 표시된다.
5. 백엔드가 꺼져 있어도 전 화면이 동작하고 CI가 통과한다.

### 2.2 비목표 (2차 이후)

- **페르소나 a~d(주택구매 4명) 전체** — 현금흐름 엔진 완성 후 별도 범위
- **상품별 점수표·탈락사유 목록** — 엔진 출력에 데이터가 없다 (§9-5 합의 필요)
- 대출 후보 비교표, 자산축적형·조기구매형 전략 비교, 스트레스 테스트 화면
- 최종 보고서 화면과 PDF·Markdown 다운로드
- 실제 백엔드 API 연동 (구조만 미리 준비)
- 거래 카테고리 분류 화면 (설계안 7.2 — 역할 3 담당 영역)
- 다크모드

### 2.3 프로토타입 이후의 전환 경로

지금은 페르소나 JSON이 "사용자 입력"과 "마이데이터"를 모두 제공한다. 실제 서비스에서는 다음과 같이 분리된다.

| 데이터 | 프로토타입 | 실제 서비스 |
|---|---|---|
| 설계안 6.1 입력값 | `user_profile.json`에서 프리필 | 사용자가 폼에 직접 입력 |
| 예적금 선호 (`savings_preferences.json`) | 파일에서 프리필 | 일부는 사용자 입력, 일부는 마이데이터 산출 (§9-4) |
| 계좌·예적금·대출·거래내역 | `bank_00*.json`에서 로드 | 마이데이터 API 연동 |

입력폼은 **처음부터 편집 가능한 실제 폼**으로 만든다. 프리필 소스만 교체하면 실제 서비스 구조가 되도록 하기 위함이다.

---

## 3. 결정사항

| # | 결정 | 근거 |
|---|---|---|
| D1 | 페르소나 데이터를 **픽스처로 생성해 web 저장소에 커밋** | 백엔드 가동 여부와 무관하게 CI·배포·시연이 동작 |
| D2 | 픽스처 생성 스크립트를 **web 저장소에 Node로** 작성 | core 저장소를 수정하지 않아 역할 1·3과 병렬 작업 가능 |
| D3 | 입력 범위: **페르소나 선택 → 6.1 값 프리필 + 마이데이터 조회** | 사용자가 자신의 마이데이터를 확인하는 경험 제공 |
| D4 | 1차 범위를 **대학생 20명으로 한정**하고 a~d는 목록에서 제외 | 결과 수치를 만들 수 없고(현금흐름 엔진 부재), 프로필 필드가 달라 요약 카드도 불가. a~d에만 있는 예외 3종(청약·ISA·마이너스통장)도 함께 회피 |
| D5 | **Tailwind v4 + shadcn/ui + React Hook Form + Recharts** | 설계안 3.1 권장안. 필요 컴포넌트 11종을 직접 만들지 않음 |
| D6 | 백엔드 계약(`simulation.ts`)을 **수정하지 않고** 프론트 계약을 분리 | 설계안 22장 규칙 3 — 공용 스키마 변경은 3인 합의 사항 |
| D7 | 상품별 점수표·탈락사유 컴포넌트를 **1차에서 제외** | 엔진 출력에 집계 숫자(`ELIGIBLE: 29` / `INELIGIBLE: 11`)만 있고 상품별 목록이 없다 |
| D8 | 계좌 분류를 `is_savings` boolean이 아닌 **`account_kind` enum**으로 | `1001`/`1002`·`1003`/`3xxx`의 3분류가 필요하고, 복귀 시 청약·투자가 추가되면 boolean으로는 못 담는다 |

### D2 대안 비교

| | web에 Node 스크립트 (채택) | core에 Python 스크립트 | web이 core를 런타임에 읽기 |
|---|---|---|---|
| core 수정 | 없음 | 필요 (합의 대기) | 없음 |
| 팀원 실행 | 불필요 (산출물 커밋) | 불필요 | **필수 — core 없으면 앱 중단** |
| 배포·CI | 정상 | 정상 | **불가** |

예적금 엔진 결과가 이미 JSON 파일로 존재하므로 Python 런타임이 필요 없다.

---

## 4. 아키텍처

### 4.1 데이터 파이프라인

```
[housing-finance-core]  읽기 전용            [housing-finance-web]
app/data_pipeline/mydata/
  persona_[e-x]/user_profile.json  ──┐
  persona_[e-x]/bank_001_accounts    │   scripts/build-fixtures.mjs
  persona_[e-x]/bank_002·003_deposit ├──►  MYDATA_DIR 환경변수로 core 경로 지정
  persona_[e-x]/bank_004_deposit_trans│    개발자만 실행 · 산출물은 커밋
  persona_[e-x]/bank_008·009_loan    │              │
  persona_[e-x]/savings_preferences  │              ▼
college_student_portfolio_results.json ─┘   src/mocks/fixtures/
                                                       │
                                                       ▼
                                              src/lib/api/  ── DATA_MODE ──┬─ fixture (현재)
                                                                          └─ live (전환 후)
```

원본 데이터는 수정하지 않는다. 분류에 필요한 정보(`account_type`·`prod_name`·`is_minus`)가 이미 원본에 전부 있으므로 스크립트의 매핑 테이블만으로 해결된다.

### 4.2 계산과 표시의 경계

설계안 2.1(계산과 설명의 분리)을 지키기 위해 스크립트가 하는 일을 제한한다.

| 스크립트가 하는 일 | 하지 않는 일 |
|---|---|
| 코드값 → 라벨 변환 (`"1001"` → 수시입출금) | DSR·LTV·대출한도 계산 |
| 계좌번호 마스킹 (설계안 2.3) | 안전소득·안전지출·월 잉여자금 산출 |
| 계좌 단위로 분산된 파일 병합 | 거래 카테고리 분류 (7.2 — 역할 3) |
| `trans_type` 월별 단순 합계 | 상품 점수·포트폴리오 (엔진 산출물 그대로 사용) |

월별 합계는 `03`(입금)을 `income`, `02`(출금)을 `expense`로 단순 합산한다. `98`(이자)은 소득과 성격이 다르므로 `interest`로 따로 집계해 `income`에 섞지 않는다. `01`(신규)·`04`~`07`(정정·취소)은 합계에서 제외한다 — 실데이터에는 없지만 방어적으로 둔다. 이 규칙은 설계안 7.3의 안전소득·안전지출과 **다른 값**이며, 그 산출은 백엔드 현금흐름 엔진의 몫이다.

집계값에는 `"derived_by": "fixture-script"` 플래그를 넣어 백엔드가 대체할 자리를 코드에서 추적 가능하게 한다.

### 4.3 픽스처 구조

```
src/mocks/fixtures/
  index.json                20명 목록과 요약 지표
  {persona_id}/
    profile.json            6.1 프리필값 (user_profile + savings_preferences 정규화)
    mydata.json             계좌·대출 + 월별 집계
    transactions.json       거래 원본 (지연 로드)
    result.json             포트폴리오 결과
```

`index.json` 항목:

```json
{
  "persona_id": "persona_e_college_student_basic",
  "display_name": "대학생1(기본형)",
  "category": "basic",
  "headline": {
    "age": 25,
    "monthly_income": 800000,
    "monthly_expense": 700000,
    "target_price": 5000000,
    "target_move_in_ym": "202807"
  },
  "portfolio_status": "COMPLETE"
}
```

`category`는 `basic`(7명) · `affluent`(6명) · `poor`(7명)이다. 시나리오는 20명 전원 `monthly_rent_deposit`이므로 필드로 두지 않는다.

`portfolio_status`는 `COMPLETE`(14) · `INFEASIBLE`(3) · `NO_ALLOCATION_REQUIRED`(3) 중 하나이며, 결과 화면 분기의 유일한 기준이다 (§5.2).

`mydata.json` (계좌 3건 중 1건만 표시한 축약 예시):

```json
{
  "as_of": "20260724",
  "accounts": [{
    "account_num_masked": "4010-**-**0001",
    "prod_name": "KB국민 대학생 생활통장",
    "account_type": "1001",
    "account_type_label": "수시입출금",
    "account_kind": "demand",
    "saving_method": "01",
    "balance_amt": 4850000,
    "withdrawable_amt": 4850000,
    "offered_rate": 0.001,
    "issue_date": "20220304",
    "has_transactions": true
  }],
  "loans": [{
    "account_num_masked": "4010-**-**0003",
    "prod_name": "한국장학재단 일반상환 학자금대출",
    "balance_amt": 12400000,
    "loan_principal": 24000000,
    "last_offered_rate": 0.021,
    "repay_method": "04",
    "repay_method_label": "원리금균등분할상환",
    "exp_date": "20330302",
    "next_repay_date": "20260820"
  }],
  "monthly_summary": [
    { "ym": "202607", "income": 2857884, "expense": 2100000, "interest": 3683, "net": 757884 }
  ],
  "totals": {
    "account_count": 3,
    "loan_count": 1,
    "total_balance": 7250000,
    "total_loan_balance": 12400000
  },
  "derived_by": "fixture-script",
  "source": { "generator": "generate_all.py", "as_of": "2026-07-24" }
}
```

마이데이터 표준에서는 예적금·대출이 모두 수시입출금과 함께 `account_list`에 담기고 `bank_002`/`bank_003`(수신)과 `bank_008`/`bank_009`(대출)가 그 상세를 제공한다. 픽스처는 이를 `account_kind`로 분류해 배열을 나눈다.

| `account_kind` | 판정 | 화면 |
|---|---|---|
| `demand` | `account_type` = `1001` | 계좌 탭 |
| `savings` | `account_type` ∈ {`1002`, `1003`} | 예적금 탭 |
| `loan` | `account_type` 3000번대 | 대출 탭 (`loans` 배열) |

판정 규칙은 스크립트 한 곳(`accountKind()`)에 모은다. 복귀 시 추가될 `deposit_subscription`(청약)·`investment`(ISA) 값은 §8 참조.

`transactions.json`은 계좌 단위로 존재하므로 `{ "<account_num_masked>": { "trans_list": [...] } }` 형태로 담고, `accounts[].has_transactions`가 `true`인 계좌만 키를 가진다.

`result.json`은 `college_student_portfolio_results.json`의 `personas[]`에서 해당 페르소나를 추출해 계약 형태로 재구성한다. 원본 엔트리가 제공하는 것은 다음과 같다.

```
persona_id · persona_name · persona_category · input{8} · calculated_options
product_policy { PASS, FAIL, UNKNOWN }        ← 집계 숫자만
evaluation     { ELIGIBLE, INELIGIBLE }       ← 집계 숫자만
portfolio {
  status · success · coverage_ratio
  monthly_allocated · monthly_unallocated · lump_sum_allocated · lump_sum_unallocated
  expected_total_principal · expected_maturity_amount · expected_net_interest
  final_policy_status · final_policy_valid
  reasons[] · validation_reasons[] · removed_by_revalidation[]
  allocations[] {
    product_name · product_kind · allocation_amount · term_months
    maturity_date · expected_maturity_amount · expected_net_interest · product_score
  }
}
```

**상품별 점수·탈락사유는 없다.** `product_score`는 실제 배분된 1~2개 상품에만 붙는다. D7의 근거다.

금액은 전부 문자열이며 소수 7자리까지 온다(`"2774194.2000000"`). 포맷터 없이는 화면에 그대로 노출되므로 §6 규칙을 반드시 적용한다.

### 4.4 계약

백엔드 계약을 무단 변경하지 않기 위해 네임스페이스를 분리한다.

```
src/lib/contracts/
  simulation.ts   기존 — 백엔드 미러. 수정하지 않음
  persona.ts      신규 — 페르소나·마이데이터 뷰 계약 (프론트 소유)
  result.ts       신규 — 포트폴리오 결과 계약 (팀 합의용 제안)
```

전부 zod 스키마로 정의하고 타입은 `z.infer`로 파생한다. 픽스처 로드 시점에 `schema.parse()`를 실행해, 스크립트가 계약을 어기면 화면이 아니라 **로드 시점에 실패**하게 한다. `live` 모드 전환 후에는 동일한 스키마가 백엔드 응답을 검증한다.

### 4.5 모듈 경계

```
src/features/
  personas/    PersonaGrid · PersonaCard · loadPersonaIndex()
  input/       InputWizard · StepBasic · StepMydata · StepGoal · schema.ts
  mydata/      MydataPanel · AccountList · SavingsList · LoanList
               TransactionTable · MonthlyFlowChart
  dashboard/   PortfolioSummary · PortfolioDonut · AllocationTable
               PortfolioStatusNotice   (INFEASIBLE · NO_ALLOCATION_REQUIRED)
src/lib/
  fixtures/    loader.ts (dynamic import + zod parse)
  format/      money.ts · date.ts · codes.ts
```

`ProductScoreTable`·`ExclusionReasons`는 D7에 따라 제외했다.

거래내역이 페르소나당 300~470건이므로 `transactions.json`을 별도 파일로 분리해 거래내역 탭을 열 때만 지연 로드한다.

---

## 5. 화면 구조

```
/                        랜딩 (기존 유지, Tailwind로 포팅)
/personas                페르소나 선택 — 20명 카드 그리드
                           필터: 기본형 7 / 여유형 6 / 취약형 7
/input?persona={id}      3-step 입력 위저드
   step 1  기본정보      user_profile.json 자동 프리필 (편집 가능)
   step 2  마이데이터    [마이데이터 불러오기] → 탭 4종
                           계좌 · 예적금 · 대출 · 거래내역
   step 3  목표설정      목표 보증금·시점·저축예산·위험성향 프리필 (편집 가능)
/dashboard?persona={id}  결과 — 예적금 포트폴리오
/report?persona={id}     보고서 (2차)
```

`?persona={id}`를 단일 진실 소스로 둔다. 새로고침·링크공유·발표 중 되감기가 안전해진다.

목록에 없는 `persona` 값(예: `persona_a_social_starter`)이 들어오면 `/personas`로 리다이렉트한다.

### 5.1 입력값 편집 시 동작

폼은 실제로 편집 가능하되, 페르소나 기본값에서 벗어나면 결과 화면 상단에 안내를 표시한다.

> 변경한 목표값은 백엔드 시뮬레이션 연동 후 반영됩니다. 현재 결과는 페르소나 기준값 기준입니다.

거짓 수치를 보여주지 않으면서 폼 UX는 실제로 유지하기 위한 장치다.

### 5.2 포트폴리오 상태별 결과 화면 분기

시나리오는 20명 전원 동일하므로, 분기 기준은 `portfolio_status` 하나다.

| 상태 | 인원 | 화면 |
|---|---|---|
| `COMPLETE` | 14 | 배분 결과 정상 표시 — 요약 카드 + 도넛 + 배분표(1~2건) |
| `INFEASIBLE` | 3 | 배분 0건. `reasons[]`를 그대로 노출 ("상품 최소 납입액, 예산 또는 예금자보호 제약을 만족하는 조합이 없습니다.") + 입력값 요약 |
| `NO_ALLOCATION_REQUIRED` | 3 | 배분 0건. 추가 저축이 필요 없다는 안내 + 입력값 요약 |

`INFEASIBLE` 3명은 `final_policy_status`가 `UNKNOWN`이므로, 정책 통과 배지를 **표시하지 않는다** (통과로 오독될 수 있다).

배분표는 1~2건뿐이므로 도넛 차트는 `COMPLETE`에서만 렌더한다.

### 5.3 프로필 필드 편차

대학생 20명 안에서도 필드 수가 다르다. `persona_e`는 32필드, 나머지 19명은 36필드이며 차이는 `character_summary` · `persona_type` · `current_assets` · `monthly_debt_payment` 4개다. 뒤 두 개는 화면에 쓰이는 값이므로, step 1은 **존재하는 필드만 렌더**하는 방식으로 흡수한다. zod 스키마에서도 해당 필드를 `optional()`로 둔다.

---

## 6. 디자인

기존 CSS 변수를 버리지 않고 Tailwind theme으로 이관한다.

| 토큰 | 값 | 용도 |
|---|---|---|
| `accent` | `#256b46` | 주요 액션·강조 |
| `background` | `#f5f7f3` | 페이지 배경 |
| `surface` | `#ffffff` | 카드 |
| `line` | `#dce4de` | 구분선 |
| `muted` | `#617068` | 보조 텍스트 |

금융 UI 규칙:

- 금액은 `tabular-nums` + 한글 단위 (`450000000` → 4억 5,000만원)
- **엔진 결과의 문자열 금액은 반드시 파싱 후 반올림** (`"2774194.2000000"` → 277만 4,194원)
- 금리는 소수를 퍼센트로 명시 변환 (`0.021` → 연 2.1%)
- 점수는 소수 2자리까지만 (`"85.54063388867203018409788706"` → 85.54점)
- 계좌번호는 항상 마스킹 (설계안 2.3)
- 모든 수치 카드에 출처·기준일 배지 (설계안 26장 "모든 추천에 이유와 데이터 기준일이 표시된다")
- 반응형: 발표 화면(1920) + 모바일 대응
- 다크모드 1차 제외

기준일은 소스마다 다르므로 픽스처에 함께 담고 카드별로 표시한다 — 마이데이터 `2026-07-24`, 엔진 결과 `2026-07-28`.

---

## 7. 완료 기준

- [ ] 대학생 20명 페르소나 선택 → 6.1 값이 입력폼에 프리필된다
- [ ] '마이데이터 불러오기' → 계좌·예적금·대출·거래내역이 표시된다
- [ ] `COMPLETE` 14명은 배분 결과가 실제 엔진 수치로 표시된다
- [ ] `INFEASIBLE` 3명은 사유가, `NO_ALLOCATION_REQUIRED` 3명은 안내가 표시되고 정책 통과 배지가 뜨지 않는다
- [ ] 문자열 금액·점수가 포맷터를 거쳐 표시된다 (소수점 노출 없음)
- [ ] 목록에 없는 `?persona=` 값은 `/personas`로 리다이렉트된다
- [ ] 백엔드가 꺼져 있어도 전 화면이 동작한다
- [ ] `npm run typecheck && npm run build` 통과
- [ ] 픽스처가 zod 스키마 검증을 통과한다

---

## 8. 위험요소

| 위험요소 | 대응 |
|---|---|
| core의 페르소나 데이터가 변경됨 | 스크립트 재실행 + 커밋. `source.as_of`로 기준일 추적 |
| 백엔드 계약이 확정되며 달라짐 | 계약을 zod로 한 곳에 모아 변경 지점을 국소화 |
| 팀원의 plain CSS 랜딩과 Tailwind 충돌 | 랜딩을 먼저 포팅하고 `globals.css`를 theme으로 이관 |
| 거래내역 페이로드 과다 | 별도 파일 + 지연 로드 |
| `03`(입금)이 월 1~2건이라 특정 월 `income`이 0 | 월별 차트에서 0인 달을 결측이 아닌 0으로 명시 표시 |

### a~d 복귀 시 추가로 필요한 것

현금흐름 엔진이 완성되어 a~d를 넣을 때, 스크립트에 다음 3가지가 **반드시** 추가되어야 한다. 지금 구현하지 않되 기록해 둔다.

1. **청약 판정** — `mydata_design.md` §4.2가 "`1003` 또는 `1999` 둘 다 허용, 대신 `prod_name`에 '청약' 문자열 필수"로 정의했다. 코드값만 보면 `1003` 청약이 적금으로 오분류된다. `account_type` + `prod_name` **병행 판정**이 필요하며, 역할 1이 청약을 주택구매 가용자산에서 분리하려면 이 문자열이 유일한 단서다.
2. **마이너스통장** (persona_d) — `account_type`이 `1001`인데 `is_minus=true`이고, `bank_002/003`(수신)과 `bank_008/009`(대출)에 **같은 계좌번호로 양쪽 다** 존재한다. "3000번대면 대출" 규칙만으로는 대출 목록에서 누락되고, 그대로 병합하면 잔액이 이중 계상된다.
3. **ISA** (persona_c, `2003`) — 원금 비보장 투자상품이다. `savings`로 분류하면 안 되고 `investment` 값이 필요하다.

또한 a~d는 `monthly_income`·`monthly_average_expense`가 없으므로 `index.json`의 `headline` 스키마를 시나리오별로 분기해야 한다.

---

## 9. 팀 합의가 필요한 항목

역할 1·3과 확인이 필요하다.

1. **`SimulationResult` 계약 확장** — 현재 `cashflow`/`savings`/`loan`/`recommendation` 각각 `{status, score, reasons}` 4개뿐이다. 설계안 7.9가 요구하는 `saving_portfolio[]`, `loan_candidates[]`, `scenario_results[]`, `stress_results[]`, `strategy_comparison`, `recommended_actions[]`가 없다. `src/lib/contracts/result.ts`를 제안본으로 작성하되 확정은 3인 합의로 한다.
2. **금액 타입** — `mydata_design.md` 3.3이 "팀 합의에 따라 문자열로 바꿀 수 있다"고 남겨둔 항목이다. 확인 결과 마이데이터는 number, 엔진 결과는 소수 7자리 문자열이다. 픽스처는 원본을 그대로 보존하고 프론트 포맷터가 흡수한다.
3. **거래 카테고리 분류 주체** — 설계안 7.2는 역할 3 담당이다. 1차에서는 분류하지 않고 월별 입출금 합계만 표시한다.
4. **`savings_preferences.json`의 성격** — `monthly_savings_budget`·`lump_sum_budget`·`emergency_reserve`(사용자 입력 성격)와 `existing_institution_deposits`(마이데이터 산출 성격)가 한 파일에 섞여 있다. 실서비스에서 어느 쪽이 어디서 오는지 확정 필요 (§2.3).
5. **상품별 점수·탈락사유 출력** — 결과 JSON에 `evaluation: {ELIGIBLE: 29, INELIGIBLE: 11}` 집계 숫자만 있고 상품별 목록이 없다. 설계안 26장의 "모든 추천에 이유가 표시된다"를 충족하려면 역할 1이 상품별 상세를 출력해야 한다. **1차 범위에서는 제외**(D7)하되 2차 이전에 합의 필요.
