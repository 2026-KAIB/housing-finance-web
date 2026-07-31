# 지역 시세 조회 연동 설계안 (B·C)

- 작성일: 2026-07-31
- 대상 저장소: `housing-finance-core`(B·C 서버), `housing-finance-web`(C 화면)
- 선행 문서: `2026-07-31-goal-region-price-design.md`(§1.1에서 예고한 B·C를 본 문서가 확정)

---

## 1. 배경

선행 사이클(A)에서 `희망 주택` 패널에 `지역` 드롭다운과 `목표 가격` 입력을 만들었다.
본 문서는 예고했던 두 덩어리를 다룬다.

| 덩어리 | 내용 |
|---|---|
| **B. DB 접속 인프라** | 개발 환경에서 원격 Postgres에 붙는 경로 확보 |
| **C. 부동산 데이터 API** | 시세 조회 엔드포인트 + 웹 연동 |

### 1.1 착수 시점에 확인한 사실

설계 전에 두 저장소와 배포 서버의 실제 상태를 확인했고, 예상과 달랐던 것이 많다.

**B는 이미 대부분 구현돼 있다.** `housing-finance-core`에 다음이 존재한다.

| 이미 있는 것 | 위치 |
|---|---|
| SQLAlchemy 엔진·커넥션 풀 | `app/db/session.py` |
| 비밀번호를 문자열로 잇지 않는 URL 조립 | `build_database_url()` (`SecretStr`) |
| `DATABASE_HOST/PORT/NAME/USER/PASSWORD` 설정 | `app/core/config.py` |
| DB 공급자 스위치 선례 | `LOAN_PRODUCT_PROVIDER=json\|database` |
| 홈서버 배포 | `docs/HOME_SERVER_BACKEND_DEPLOYMENT.md` |

**C의 이음매도 미리 뚫려 있다.** `PropertyListingRepository` Protocol에
"implemented by JSON now and by a database repository later"라고 적혀 있고,
`PropertyDataSourceType`에는 `DATABASE` 값이 이미 있다.

**배포된 API는 살아 있으나 MOCK을 반환한다.** 실측:

```
POST http://211.108.229.31:18082/api/v1/properties/search  {"region_codes":["11680"]}
→ {"source":{"source_type":"MOCK","source_name":"team-mock-property-data"},
   "total_count":0,"candidates":[]}
```

**부동산 테이블은 이미 적재돼 있다**(사용자 확인). core 저장소에는 마이그레이션도 ETL도
없으므로, 테이블은 이 저장소 밖에서 구축됐다. **본 사이클은 읽기 전용이다** — DDL을
만들지 않고, 적재하지 않고, `REFRESH MATERIALIZED VIEW`도 하지 않는다.

### 1.2 이 DB로 할 수 없는 것

`db_schema_realestate.md`를 정본으로 삼는다. 그 문서의 "참고 1"이 명시하듯,
**이 DB에는 판매 중인 매물 목록이 없다.**

| 한계 | 결과 |
|---|---|
| `apt_trades`는 실거래 **체결 이력**(2025-07-01~2026-07-22) | "지금 살 수 있는 집" 목록을 만들 수 없다 |
| 동·호수 컬럼 없음 | 개별 물건을 식별할 수 없다 |
| 전월세 실거래 없음 | 전세 시나리오는 이 데이터로 불가 |

따라서 사용자 요청의 "매물 데이터"는 **지역×평형 시세 통계**로 구현된다.
`목표 가격`은 "매물을 골라 그 가격을 쓴다"가 아니라
**"시세 중위값을 제안하고 사용자가 확정한다"**가 된다.

기존 `/properties/search`(MOCK JSON)는 **건드리지 않는다.** 시세는 성격이 다른
데이터이므로 기존 계약에 끼워넣지 않고 별도 엔드포인트로 낸다.

---

## 2. B. DB 접속

### 2.1 터널은 앱이 아니라 개발자가 연다

운영에서는 FastAPI와 Postgres가 같은 Docker 네트워크에 있어(`postgres:5432`)
**터널이 아예 필요 없다.** 터널은 개발자 로컬에서만 필요하다.

앱에 SSH 클라이언트를 심지 않는 이유는 세 가지다.

1. 운영 경로에서 전혀 실행되지 않는 코드가 앱에 상주한다.
2. root SSH 자격증명이 애플리케이션 환경변수로 들어간다 — DB 계정보다 훨씬 강한 권한이다.
3. 터널 생명주기(재접속·헬스체크)를 앱이 떠안는다.

개발자는 별도 터미널에서 한 줄을 실행한다.

```bash
ssh -p 18081 -L 15432:localhost:5432 root@211.108.229.31
```

로컬 `5432`에 다른 Postgres가 떠 있을 수 있으므로 **`15432`로 받는다.**
같은 포트로 받으면 터널이 안 열린 상태에서도 로컬 DB에 조용히 붙어,
"연결은 되는데 테이블이 없다"는 혼란스러운 실패가 난다.

### 2.2 접속 값은 전부 `.env`

`housing-finance-core/.env`(git 추적 안 함):

```dotenv
DATABASE_HOST=localhost
DATABASE_PORT=15432
DATABASE_NAME=mydb
DATABASE_USER=myuser
DATABASE_PASSWORD=<실제 비밀번호>
REGION_PRICE_PROVIDER=database
```

`.env.example`에는 **키만 두고 값은 비운다.** 선행 사이클에서 카카오 키에
그럴듯한 임시값을 넣었다가 "키 없음" 경로가 도달 불가능해진 전례가 있다.
값이 비어 있어야 미설정 상태가 실제로 재현된다.

`app/core/config.py`의 `database_password`는 이미 `SecretStr`이라
로그·예외 메시지에 값이 찍히지 않는다. 이 타입을 바꾸지 않는다.

---

## 3. C. 시세 조회 API

### 3.1 왜 `apt_price_stats`를 직접 읽고 `fn_price_reference`를 쓰지 않는가

`fn_price_reference(p_lawd_cd CHAR(10), p_area_band, p_ym)`는 **법정동 10자리**를 받아
`dong_month → dong_all → sgg_all` 폴백 사다리를 탄다.

그런데 폼이 주는 값은 **시군구 5자리**(`11680`)다. 법정동을 고르는 UI가 없으므로
함수에 넘길 인자 자체가 없다. 구 단위 선택에는 폴백 사다리의 마지막 칸인
`stat_level='sgg_all'`이 정확히 대응한다.

스키마 문서 §8 기준 `sgg_all`은 125행(25구 × 5평형)이고 그중 **124행이
`is_reliable`**이다. 구 단위에서는 표본 부족이 사실상 발생하지 않는다.

법정동 단위 조회가 필요해지면 그때 `fn_price_reference`를 쓰는 별도 엔드포인트를
추가한다. 지금 함수를 억지로 끼우면 존재하지 않는 법정동 코드를 UI가 지어내야 한다.

### 3.2 엔드포인트

```
GET /api/v1/properties/price-reference?sgg_code=11680
```

`GET`인 이유: 스칼라 인자 하나짜리 순수 조회이고 캐시 가능하다.
기존 `/search`가 `POST`인 것은 검색 조건이 복합 객체이기 때문이며, 두 엔드포인트의
메서드가 다른 것은 형태가 다르기 때문이지 일관성이 깨진 것이 아니다.

`sgg_code`는 `^11\d{3}$`로 검증한다(FastAPI `Query(pattern=...)` → 422 자동).
`ALL`·`26440`(부산)·`abc`는 여기서 걸린다.

25개 구 목록을 core에 다시 두지 않는 이유: 그 목록의 정본은 DB의 `sgg_codes`
테이블이고, 조회가 어차피 그 테이블을 지난다. 상수로 복제하면 DB와 어긋날 때
어느 쪽이 맞는지 판단할 근거가 없어진다. 형식만 코드로 막고 **존재 여부는 DB가
답한다.**

### 3.3 응답 계약

새 파일 `app/schemas/property_price.py`. 기존 `property.py`에 넣지 않는 이유는
그 파일이 "매물 목록" 계약이고 시세는 다른 데이터이기 때문이다.

```python
class AreaBand(StrEnum):
    LT40    = "lt40"      # 40㎡ 미만
    A40_60  = "40_60"
    A60_85  = "60_85"     # 85㎡ 경계 = 디딤돌·보금자리론 요건
    A85_135 = "85_135"
    GTE135  = "gte135"

class RegionPriceBand(BaseModel):
    area_band: AreaBand
    trade_count: int          # apt_price_stats.trade_cnt
    median_price_won: int
    p25_price_won: int
    p75_price_won: int
    median_price_per_pyeong_won: int | None   # median_ppp_won
    is_reliable: bool

class RegionPriceReference(BaseModel):
    schema_version: Literal["1.0.0"] = "1.0.0"
    sgg_code: str
    sgg_name: str
    stat_level: Literal["sgg_all"] = "sgg_all"
    computed_at: datetime | None       # 통계가 없으면 None
    bands: tuple[RegionPriceBand, ...]
```

`period_key`는 응답에 넣지 않는다. `sgg_all` 행에서는 항상 `"ALL"`이라
`stat_level`이 이미 말하는 것을 반복할 뿐이다.

`stat_level`과 `computed_at`을 응답에 포함하는 이유는 스키마 문서 §10의 근거와 같다 —
**사용자가 보는 숫자가 어느 단위·어느 기준일의 것인지 화면이 말할 수 있어야 한다.**
"데이터 기준일이 없는 결과는 제공하지 않는다"는 core의 기존 원칙과도 일치한다.

`median_ppp_won`은 **전용면적 기준**이다. 시장에서 통용되는 평단가는 공급면적 기준이라
20~30% 낮게 나오므로, 화면에 낼 때 반드시 "전용 기준"을 함께 표기한다
(스키마 문서 §6의 `price_per_pyeong_exclusive_won` 명명 근거와 동일한 이유).

### 3.4 리포지토리

`app/db/repositories/region_price_repository.py`.
기존 `loan_product_repository.py`와 같은 자리·같은 방식(`sqlalchemy.text` + 명시 파라미터).

```sql
-- 1) 구 존재 확인 + 이름
SELECT sgg_nm FROM sgg_codes WHERE sgg_cd = :sgg_code

-- 2) 시세 통계
SELECT area_band, trade_cnt, median_price_won,
       p25_price_won, p75_price_won, median_ppp_won,
       is_reliable, computed_at
  FROM apt_price_stats
 WHERE stat_level = 'sgg_all'
   AND scope_cd = :sgg_code
```

`scope_cd`로 거르는 이유: `UNIQUE (stat_level, scope_cd, area_band, period_key)`가
이 조합 위에 걸려 있어 인덱스가 그대로 탄다. `sgg_all` 행에서는 `scope_cd = sgg_cd`다.

**정렬은 SQL이 아니라 Python에서 한다.** `area_band`는 VARCHAR이므로
`ORDER BY area_band`는 사전순이 되어

```
'40_60' < '60_85' < '85_135' < 'gte135' < 'lt40'
```

즉 **가장 작은 평형(`lt40`)이 맨 뒤로 간다.** SQL에 `CASE`를 쓰는 대신
`AreaBand` 선언 순서로 파이썬에서 정렬한다 — 열거형이 이미 순서의 정본이고,
순서 정의가 두 곳에 흩어지지 않는다.

### 3.5 공급자 스위치

`LOAN_PRODUCT_PROVIDER`의 선례를 따른다.

```python
region_price_provider: Literal["disabled", "database"] = "disabled"
```

기본값이 `disabled`인 이유: 터널을 열지 않은 로컬에서도 앱 전체가 떠야 하고,
DB가 필요한 이 엔드포인트만 **503**을 내야 한다. JSON 폴백은 두지 않는다 —
시세는 가짜 값을 보여주면 안 되는 종류의 데이터다.

| 상태 | 응답 |
|---|---|
| 코드 형식 오류 | 422 (FastAPI 기본) |
| `disabled` | 503 `시세 데이터 공급자가 설정되지 않았습니다.` |
| `database`, 연결 실패 | 503 `시세 데이터를 불러올 수 없습니다.` |
| `sgg_codes`에 없는 코드 | 404 `해당 시군구 코드를 찾을 수 없습니다.` |
| 구는 있으나 통계 행 없음 | 200, `bands: []`, `computed_at: null` |

**세 가지 실패를 구분한다.** 연결 실패(503) / 없는 구(404) / 통계 없음(200 + 빈 배열)을
합치면, 터널이 끊긴 것과 코드가 틀린 것과 그 구에 통계가 없는 것을 화면이 같은 말로
설명하게 된다.

이 구분 때문에 조회는 **쿼리 두 개**다 — 먼저 `sgg_codes`에서 구 이름을 찾고(없으면 404),
그다음 `apt_price_stats`를 읽는다. 한 번의 JOIN으로 합치면 결과가 0행일 때 두 원인을
구별할 수 없다. 두 쿼리 모두 PK/UNIQUE 인덱스를 타므로 비용은 무시할 수 있다.

DB 오류는 `logger.error(..., exc_info=True)`로 남기되 응답 본문에는 넣지 않는다.
접속 정보가 예외 메시지를 타고 나가지 않게 하기 위해서다.

---

## 4. 웹 연동

### 4.1 화면

`희망 주택` 패널에서 `지역`을 고르면 그 아래에 시세 표가 나타난다.

```
┌────────────────────────┬────────────────────────┐
│ 지역                    │ 목표 가격 (원)          │
│ [강남구             ▾] │ [2280000000        ]   │
└────────────────────────┴────────────────────────┘

강남구 시세 · 최근 1년 · 2026-07-30 기준
┌──────────┬──────────────┬────────┐
│ 40㎡ 미만 │  9억 2,000만원 │  87건  │  ← 행을 누르면
│ 40~60㎡  │ 14억 5,000만원 │ 210건  │     목표 가격에 채워짐
│ 60~85㎡  │ 22억 8,000만원 │ 342건  │
│ 85~135㎡ │ 31억 1,000만원 │ 156건  │
│ 135㎡ 이상│ 45억원        │  41건  │
└──────────┴──────────────┴────────┘

┌──────────────────────────────────────────────────┐
│                  대한민국 지도                     │
└──────────────────────────────────────────────────┘
```

표는 **제안일 뿐 `목표 가격`을 대체하지 않는다.** 조회가 실패하든 데이터가 없든
사용자는 언제나 금액을 직접 입력할 수 있고, `다음` 버튼의 조건도 바뀌지 않는다
(선행 문서 §4의 판정 방식 유지). 이 원칙이 깨지면 DB가 죽는 순간 폼 전체가 막힌다.

행을 누르면 `setValue("target_price", median_price_won, { shouldValidate: true })`.
값이 들어간 뒤에도 사용자는 그 위에서 다시 수정할 수 있다.

### 4.2 상태

| 상태 | 조건 | 화면 |
|---|---|---|
| 미선택 | `target_region === ""` | 표 없음 |
| 전체 | `target_region === "ALL"` | `구를 선택하면 해당 지역 시세를 보여드립니다.` |
| 로딩 | 요청 중 | 자리표시 |
| 정상 | `bands.length > 0` | 표 |
| 데이터 없음 | `bands.length === 0` | `이 지역의 시세 통계가 아직 없습니다.` |
| 오류 | 503/네트워크 | `시세를 불러오지 못했습니다. 금액은 직접 입력할 수 있습니다.` |

**`전체`(ALL)일 때는 API를 호출하지 않는다.** `apt_price_stats`에 서울 전체 grain이
없고, 25개 구의 중위값을 다시 중위내는 것은 통계적으로 틀린 값이다
(중위값의 중위값 ≠ 전체 중위값). 없는 숫자를 만들어 보여주느니 안 보여준다.

### 4.3 신뢰할 수 없는 통계

`is_reliable === false`인 행은 **숨기지 않고 표시하되 "표본 부족"을 함께 낸다.**
숨기면 5줄이어야 할 표가 4줄로 나오는 이유를 화면이 설명할 방법이 없다.
클릭은 허용한다 — 사용자가 근거를 보고 판단할 문제다.

### 4.4 요청 취소

지역을 빠르게 연달아 바꾸면 응답이 순서를 어겨 도착할 수 있다.
`AbortController`로 이전 요청을 취소하고, 취소된 응답은 상태에 반영하지 않는다.
이게 없으면 강남구를 골랐는데 이전에 요청한 종로구 시세가 덮어쓰는 일이 생긴다.

---

## 5. 파일 구성

### `housing-finance-core`

| 파일 | 책임 | 작업 |
|---|---|---|
| `app/schemas/property_price.py` | `AreaBand`·`RegionPriceBand`·`RegionPriceReference` | 생성 |
| `app/db/repositories/region_price_repository.py` | `apt_price_stats` 조회 SQL + 행→모델 매핑 | 생성 |
| `app/services/region_price.py` | 공급자 스위치, `RegionPriceUnavailable` | 생성 |
| `app/api/routes/properties.py` | `GET /price-reference` 추가 | 수정 |
| `app/core/config.py` | `region_price_provider` 추가 | 수정 |
| `.env.example` | 공급자 키 추가(값 비움) | 수정 |
| `scripts/check_region_price_db.py` | 실제 스키마 점검 | 생성 |
| `docs/LOCAL_DB_TUNNEL.md` | 터널 여는 법 | 생성 |

### `housing-finance-web`

| 파일 | 책임 | 작업 |
|---|---|---|
| `src/lib/api/region-price.ts` | 타입 + `fetchRegionPrice(sggCode, signal)` | 생성 |
| `src/features/input/region-price-table.tsx` | 표 + 6가지 상태 + 클릭 시 채우기 | 생성 |
| `src/features/input/desired-home-panel.tsx` | 표 배치 | 수정 |
| `.env.example` | `NEXT_PUBLIC_API_BASE_URL` 확인 | 수정 |

---

## 6. 검증

### 6.1 자동 테스트

DB에 붙지 않고 도는 것만 자동화한다.

| 대상 | 방식 |
|---|---|
| 리포지토리 | 가짜 `Connection`이 고정 행을 돌려주고, 매핑·정렬을 검증 |
| 정렬 | `lt40`이 **맨 앞**, `gte135`가 맨 뒤 (사전순이면 실패하는 테스트) |
| 엔드포인트 | FastAPI `dependency_overrides` |
| 공급자 스위치 | `disabled` → 503, 연결 실패 → 503, 빈 결과 → 200 + `bands: []` |
| 코드 검증 | `ALL`·`26440`·`abc` → 422 |
| 웹 클라이언트 | `fetch` 목, 취소 동작 |
| 웹 표 | 6가지 상태, 행 클릭 시 `target_price` 반영 |

### 6.2 실제 DB 검증은 자동화하지 않는다

**본 사이클 작성 시점에 개발 환경에서 DB에 접속할 수 없다.** Postgres 5432는
외부에 포워딩돼 있지 않고(설계대로), 터널을 열려면 root SSH 자격증명이 필요하다.

따라서 SQL이 실제 테이블과 맞는지는 **점검 스크립트로 한 번 확인한다.**

```bash
python scripts/check_region_price_db.py 11680
```

이 스크립트는 읽기 전용이며 다음을 순서대로 확인하고 사람이 읽을 결과를 출력한다.

1. 연결 성공 여부
2. `sgg_codes`·`apt_price_stats` 존재 여부
3. `apt_price_stats`의 실제 컬럼명이 문서와 일치하는지
4. `stat_level='sgg_all'` 행 수(문서 기준 125)
5. 주어진 구의 5개 평형대 조회 결과

문서와 실물이 어긋나면 이 스크립트가 **어느 컬럼이 다른지** 짚는다.
스키마 문서를 정본으로 구현하되, 정본이 틀렸을 가능성을 확인할 경로를 남기는 것이다.

---

## 7. 범위 밖

| 항목 | 이유 |
|---|---|
| 마이그레이션·ETL | 테이블은 이미 적재됨. 본 사이클은 읽기 전용 |
| 법정동 단위 조회 / `fn_price_reference` | 법정동을 고르는 UI가 없다 |
| 단지별 시세(`apt_complex_price_stats`) | 단지 상세 화면이 없다 |
| 지도와 시세 연동 | `KakaoMap`이 prop 변경 시 인스턴스를 재생성하는 기존 문제가 선결 과제 |
| 기존 `/properties/search`의 DB 전환 | 이 DB에 매물 목록이 없다. MOCK 유지 |
| `housing_goals` 스냅샷 컬럼 | 사용자 데이터 저장 기능 자체가 아직 없다 |
