# 지역 시세 조회 연동 구현 계획 (B·C)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 서울 시군구 코드를 받아 `apt_price_stats`의 5개 평형대 시세를 돌려주는 읽기 전용 API를 core에 만들고, 웹의 `희망 주택` 패널이 그 값을 `목표 가격` 제안으로 쓰게 한다.

**Architecture:** core는 `설정 → 리포지토리(순수 매핑 + SQL) → 서비스(공급자 스위치) → 엔드포인트` 4층으로 쌓는다. 기존 `loan_product_repository.py` / `loan_product_catalog.py`가 이미 이 형태이므로 같은 구조·같은 이름 규칙을 따른다. 웹은 `apiRequest` 위에 타입 클라이언트를 얹고, 표시 전용 컴포넌트 하나가 6가지 상태를 그린다.

**Tech Stack:** Python 3.12 / FastAPI / SQLAlchemy 2.0 Core(`text()`) / psycopg3 / Pydantic v2 / pytest — Next.js 16 / React 19 / TypeScript strict / react-hook-form 7 / Vitest 4 + Testing Library

**선행 문서:** `docs/superpowers/specs/2026-07-31-region-price-reference-design.md`

## Global Constraints

- **읽기 전용이다.** DDL·INSERT·UPDATE·`REFRESH MATERIALIZED VIEW`를 만들지 않는다. 테이블은 이미 적재돼 있다.
- **접속 정보는 전부 `.env`.** 코드·테스트·문서·커밋에 실제 호스트/계정/비밀번호를 넣지 않는다. `.env.example`에는 **키만 두고 값은 비운다.**
- 스키마 정본은 `db_schema_realestate.md`다. 컬럼명은 그 문서를 따른다 — `trade_cnt`, `median_price_won`, `p25_price_won`, `p75_price_won`, `median_ppp_won`, `is_reliable`, `computed_at`, `stat_level`, `scope_cd`, `area_band`, `sgg_cd`, `sgg_nm`.
- `area_band` 값 5종은 정확히 `lt40`, `40_60`, `60_85`, `85_135`, `gte135`이며 **이 순서가 크기 순서**다. 사전순 정렬은 금지(`lt40`이 맨 뒤로 간다).
- 금액은 **원 단위 정수**(`BIGINT`). 만원 단위로 바꾸지 않는다.
- DB 예외는 `logger.error(..., exc_info=True)`로 남기고 **응답 본문에는 넣지 않는다.**
- 시세 조회 실패가 `목표 가격` 입력이나 `다음` 버튼을 막아서는 안 된다.
- core: `ruff` 통과(line-length 100), `pytest` 전체 통과. web: `npm test`·`npm run typecheck`·`npm run build` 전체 통과.
- 커밋 메시지는 한국어, 기존 저장소 관례를 따른다.

**저장소 경로**
- core: `/Users/programming/housing-finance-system/housing-finance-core` (브랜치 `jpyo`)
- web: `/Users/programming/housing-finance-system/housing-finance-web` (브랜치 `feature/frontend-prototype`)

---

### Task 1: core 설정과 로컬 터널 문서 (B)

**Files:**
- Modify: `app/core/config.py`
- Modify: `.env.example`
- Create: `docs/LOCAL_DB_TUNNEL.md`
- Test: `tests/db/test_session.py` (기존 파일에 추가)

**Interfaces:**
- Consumes: 없음
- Produces: `Settings.region_price_provider: Literal["disabled", "database"]` — Task 3이 읽는다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/db/test_session.py` 끝에 추가한다.

```python
def test_region_price_provider_defaults_to_disabled() -> None:
    config = Settings(_env_file=None)

    assert config.region_price_provider == "disabled"


def test_region_price_provider_reads_database_from_env() -> None:
    config = Settings(_env_file=None).model_copy(
        update={"region_price_provider": "database"}
    )

    assert config.region_price_provider == "database"
```

기본값이 `disabled`인 것을 테스트로 고정하는 이유: 터널을 열지 않은 개발자의 로컬에서도 앱 전체가 떠야 한다. 기본값이 `database`로 바뀌면 DB 없는 환경에서 앱이 죽는다.

- [ ] **Step 2: 실패 확인**

Run: `cd /Users/programming/housing-finance-system/housing-finance-core && python -m pytest tests/db/test_session.py -v`
Expected: FAIL — `AttributeError` 또는 pydantic 검증 오류(`region_price_provider` 없음)

- [ ] **Step 3: 설정 추가**

`app/core/config.py`의 `loan_product_provider` 바로 아래 줄에 추가한다.

```python
    # 시세 통계는 JSON 폴백을 두지 않는다 — 가짜 시세를 보여주면 안 되는
    # 데이터이므로, 공급자가 없으면 해당 엔드포인트만 503을 낸다.
    region_price_provider: Literal["disabled", "database"] = "disabled"
```

- [ ] **Step 4: 통과 확인**

Run: `python -m pytest tests/db/test_session.py -v`
Expected: PASS (기존 테스트 포함 전부)

- [ ] **Step 5: `.env.example` 수정**

`LOAN_PRODUCT_PROVIDER=json` 다음 줄에 추가한다.

```dotenv
# 시세 조회 공급자. database로 두면 apt_price_stats를 읽는다.
# 로컬에서 SSH 터널을 열지 않았다면 disabled로 둔다.
REGION_PRICE_PROVIDER=disabled
```

그리고 기존 주석 처리된 `DATABASE_*` 블록을 아래로 교체한다. **값은 비운다** — 그럴듯한 임시값을 넣으면 "미설정" 상태가 재현 불가능해진다.

```dotenv
# DATABASE_URL 대신 아래 항목을 사용하면 비밀번호에 특수문자가 있어도
# URL 인코딩 없이 안전하게 연결할 수 있습니다.
# 로컬 개발은 docs/LOCAL_DB_TUNNEL.md 를 따라 SSH 터널을 먼저 연다.
# DATABASE_HOST=localhost
# DATABASE_PORT=15432
# DATABASE_NAME=
# DATABASE_USER=
# DATABASE_PASSWORD=
```

- [ ] **Step 6: 터널 문서 작성**

`docs/LOCAL_DB_TUNNEL.md`를 만든다. **실제 호스트·포트·계정을 적지 않는다** — 자리표시자만 쓴다.

````markdown
# 로컬 개발용 DB 터널

운영에서는 FastAPI와 PostgreSQL이 같은 Docker 네트워크에 있어(`postgres:5432`)
터널이 필요 없다. 이 문서는 **개발자 로컬에서만** 해당한다.

## 왜 앱이 터널을 열지 않는가

1. 운영 경로에서 한 번도 실행되지 않는 코드가 앱에 남는다.
2. root SSH 자격증명이 애플리케이션 환경변수로 들어간다 — DB 계정보다 훨씬 강한 권한이다.
3. 재접속·헬스체크 같은 터널 생명주기를 앱이 떠안는다.

## 여는 법

별도 터미널에서 실행하고, 개발하는 동안 창을 열어 둔다.

```bash
ssh -p <SSH_PORT> -L 15432:localhost:5432 <USER>@<HOST>
```

로컬 `5432`가 아니라 **`15432`로 받는다.** 로컬에 다른 PostgreSQL이 떠 있으면
같은 포트로 받았을 때 터널이 안 열린 상태에서도 조용히 로컬 DB에 붙어,
"연결은 되는데 테이블이 없다"는 혼란스러운 실패가 난다.

## `.env`

`.env`는 git이 추적하지 않는다. 실제 값은 여기에만 둔다.

```dotenv
DATABASE_HOST=localhost
DATABASE_PORT=15432
DATABASE_NAME=<DB 이름>
DATABASE_USER=<계정>
DATABASE_PASSWORD=<비밀번호>
REGION_PRICE_PROVIDER=database
```

## 확인

```bash
pg_isready -h localhost -p 15432
python scripts/check_region_price_db.py 11680
```

터널이 닫혀 있으면 `pg_isready`가 `no response`를 낸다.
````

- [ ] **Step 7: ruff와 전체 테스트**

Run: `ruff check app tests && python -m pytest -q`
Expected: 통과

- [ ] **Step 8: 커밋**

```bash
git add app/core/config.py .env.example docs/LOCAL_DB_TUNNEL.md tests/db/test_session.py
git commit -m "feat(config): 시세 공급자 스위치와 로컬 터널 문서를 추가한다"
```

---

### Task 2: core 시세 계약과 리포지토리

**Files:**
- Create: `app/schemas/property_price.py`
- Create: `app/db/repositories/region_price_repository.py`
- Modify: `app/db/repositories/__init__.py`
- Test: `tests/db/test_region_price_repository.py`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `AreaBand(StrEnum)` — `LT40="lt40"`, `A40_60="40_60"`, `A60_85="60_85"`, `A85_135="85_135"`, `GTE135="gte135"`
  - `RegionPriceBand(BaseModel)`, `RegionPriceReference(BaseModel)`
  - `build_region_price_reference(sgg_code: str, sgg_name: str, rows: Sequence[Mapping[str, Any]]) -> RegionPriceReference` — 순수 함수
  - `fetch_region_name(connection: Connection, sgg_code: str) -> str | None`
  - `fetch_region_price_rows(connection: Connection, sgg_code: str) -> list[dict[str, Any]]`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/db/test_region_price_repository.py`를 만든다.

```python
from datetime import datetime
from zoneinfo import ZoneInfo

import pytest

from app.db.repositories.region_price_repository import build_region_price_reference
from app.schemas.property_price import AreaBand

SEOUL = ZoneInfo("Asia/Seoul")
COMPUTED_AT = datetime(2026, 7, 30, 9, 0, tzinfo=SEOUL)


def _row(area_band: str, median: int, *, reliable: bool = True) -> dict:
    """db_schema_realestate.md §8의 apt_price_stats 행 형태를 그대로 따른다."""
    return {
        "area_band": area_band,
        "trade_cnt": 120,
        "median_price_won": median,
        "p25_price_won": median - 100_000_000,
        "p75_price_won": median + 100_000_000,
        "median_ppp_won": 30_000_000,
        "is_reliable": reliable,
        "computed_at": COMPUTED_AT,
    }


def test_bands_are_ordered_by_area_not_alphabetically() -> None:
    # DB가 사전순으로 돌려준 상태를 흉내낸다. 사전순이면 lt40이 맨 뒤다.
    rows = [
        _row("40_60", 1_400_000_000),
        _row("60_85", 2_200_000_000),
        _row("85_135", 3_100_000_000),
        _row("gte135", 4_500_000_000),
        _row("lt40", 900_000_000),
    ]

    reference = build_region_price_reference("11680", "강남구", rows)

    assert [band.area_band for band in reference.bands] == [
        AreaBand.LT40,
        AreaBand.A40_60,
        AreaBand.A60_85,
        AreaBand.A85_135,
        AreaBand.GTE135,
    ]


def test_maps_db_columns_to_contract_names() -> None:
    reference = build_region_price_reference("11680", "강남구", [_row("60_85", 2_200_000_000)])

    band = reference.bands[0]
    assert band.trade_count == 120
    assert band.median_price_won == 2_200_000_000
    assert band.p25_price_won == 2_100_000_000
    assert band.p75_price_won == 2_300_000_000
    assert band.median_price_per_pyeong_won == 30_000_000
    assert band.is_reliable is True


def test_carries_region_identity_and_computed_at() -> None:
    reference = build_region_price_reference("11680", "강남구", [_row("60_85", 2_200_000_000)])

    assert reference.sgg_code == "11680"
    assert reference.sgg_name == "강남구"
    assert reference.stat_level == "sgg_all"
    assert reference.computed_at == COMPUTED_AT


def test_empty_rows_produce_empty_bands_without_computed_at() -> None:
    reference = build_region_price_reference("11680", "강남구", [])

    assert reference.bands == ()
    assert reference.computed_at is None
    assert reference.sgg_name == "강남구"


def test_unreliable_band_is_kept_with_its_flag() -> None:
    reference = build_region_price_reference(
        "11110", "종로구", [_row("gte135", 4_000_000_000, reliable=False)]
    )

    # 숨기지 않는다 — 5줄이어야 할 표가 4줄로 나오는 이유를 화면이 설명할 수 없다.
    assert len(reference.bands) == 1
    assert reference.bands[0].is_reliable is False


def test_median_price_per_pyeong_may_be_missing() -> None:
    row = _row("60_85", 2_200_000_000)
    row["median_ppp_won"] = None

    reference = build_region_price_reference("11680", "강남구", [row])

    assert reference.bands[0].median_price_per_pyeong_won is None


def test_unknown_area_band_is_rejected() -> None:
    # 스키마에 없는 구간이 조용히 통과하면 화면에 라벨 없는 행이 생긴다.
    with pytest.raises(ValueError):
        build_region_price_reference("11680", "강남구", [_row("30_40", 500_000_000)])
```

- [ ] **Step 2: 실패 확인**

Run: `python -m pytest tests/db/test_region_price_repository.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.schemas.property_price'`

- [ ] **Step 3: 계약 작성**

`app/schemas/property_price.py`:

```python
"""지역 시세 통계 계약. 매물 목록(`property.py`)과는 다른 데이터다."""

from datetime import datetime
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

REGION_PRICE_SCHEMA_VERSION = "1.0.0"


class AreaBand(StrEnum):
    """전용면적 구간. **선언 순서가 곧 크기 순서**이며 정렬의 정본이다.

    값 문자열을 사전순으로 정렬하면
    `40_60 < 60_85 < 85_135 < gte135 < lt40`이 되어 가장 작은 평형이 맨 뒤로
    간다. 그래서 SQL `ORDER BY area_band`를 쓰지 않는다.

    85㎡ 경계는 임의가 아니다 — 디딤돌·보금자리론이 전용 85㎡ 이하를 요건으로
    걸기 때문에, 시세 조회 결과가 그대로 대출상품 필터의 입력이 된다.
    """

    LT40 = "lt40"
    A40_60 = "40_60"
    A60_85 = "60_85"
    A85_135 = "85_135"
    GTE135 = "gte135"


class RegionPriceBand(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    area_band: AreaBand
    trade_count: int = Field(ge=0)
    median_price_won: int = Field(gt=0)
    p25_price_won: int = Field(gt=0)
    p75_price_won: int = Field(gt=0)
    # 전용면적 기준이다. 시장 통용 평단가(공급면적 기준)보다 20~30% 낮으므로
    # 화면에 낼 때 반드시 "전용 기준"을 함께 표기한다.
    median_price_per_pyeong_won: int | None = Field(default=None, gt=0)
    is_reliable: bool


class RegionPriceReference(BaseModel):
    """한 자치구의 평형대별 시세. `stat_level='sgg_all'` 기준."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    schema_version: Literal["1.0.0"] = REGION_PRICE_SCHEMA_VERSION
    sgg_code: str = Field(pattern=r"^\d{5}$")
    sgg_name: str = Field(min_length=1)
    stat_level: Literal["sgg_all"] = "sgg_all"
    # 통계 행이 하나도 없으면 기준일도 없다.
    computed_at: datetime | None = None
    bands: tuple[RegionPriceBand, ...] = ()
```

- [ ] **Step 4: 리포지토리 작성**

`app/db/repositories/region_price_repository.py`:

```python
"""`apt_price_stats`에서 자치구 단위 시세를 읽는다(읽기 전용)."""

from collections.abc import Mapping, Sequence
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.schemas.property_price import AreaBand, RegionPriceBand, RegionPriceReference

# 구 존재 확인과 시세 조회를 나눈 이유: 한 번의 JOIN으로 합치면 결과가 0행일 때
# "없는 구"와 "통계가 아직 없는 구"를 구별할 수 없다. 화면이 두 경우에 다른 말을
# 해야 하므로 원인을 여기서 갈라 준다. 두 쿼리 모두 PK/UNIQUE 인덱스를 탄다.
_REGION_NAME_SQL = text("""
    SELECT sgg_nm
      FROM sgg_codes
     WHERE sgg_cd = :sgg_code
""")

# UNIQUE (stat_level, scope_cd, area_band, period_key) 위에서 도는 조회다.
# sgg_all 행에서는 scope_cd = sgg_cd이고 period_key = 'ALL'이다.
_REGION_PRICE_SQL = text("""
    SELECT area_band,
           trade_cnt,
           median_price_won,
           p25_price_won,
           p75_price_won,
           median_ppp_won,
           is_reliable,
           computed_at
      FROM apt_price_stats
     WHERE stat_level = 'sgg_all'
       AND scope_cd = :sgg_code
""")

# 크기 순서. AreaBand 선언 순서가 정본이므로 여기서 다시 적지 않는다.
_AREA_BAND_ORDER = {band: index for index, band in enumerate(AreaBand)}


def build_region_price_reference(
    sgg_code: str,
    sgg_name: str,
    rows: Sequence[Mapping[str, Any]],
) -> RegionPriceReference:
    """조회 행을 계약으로 바꾼다(순수 함수).

    DB 접속 없이 매핑과 정렬을 검증할 수 있도록 I/O와 분리했다.
    """
    bands = [
        RegionPriceBand(
            area_band=AreaBand(row["area_band"]),
            trade_count=row["trade_cnt"],
            median_price_won=row["median_price_won"],
            p25_price_won=row["p25_price_won"],
            p75_price_won=row["p75_price_won"],
            median_price_per_pyeong_won=row["median_ppp_won"],
            is_reliable=row["is_reliable"],
        )
        for row in rows
    ]
    bands.sort(key=lambda band: _AREA_BAND_ORDER[band.area_band])

    return RegionPriceReference(
        sgg_code=sgg_code,
        sgg_name=sgg_name,
        computed_at=rows[0]["computed_at"] if rows else None,
        bands=tuple(bands),
    )


def fetch_region_name(connection: Connection, sgg_code: str) -> str | None:
    """`sgg_codes`에 있으면 구 이름을, 없으면 None을 돌려준다."""
    return connection.execute(_REGION_NAME_SQL, {"sgg_code": sgg_code}).scalar_one_or_none()


def fetch_region_price_rows(connection: Connection, sgg_code: str) -> list[dict[str, Any]]:
    """자치구 단위 시세 행을 정렬 없이 그대로 읽는다."""
    return [
        dict(row)
        for row in connection.execute(_REGION_PRICE_SQL, {"sgg_code": sgg_code}).mappings()
    ]
```

- [ ] **Step 5: 내보내기 추가**

`app/db/repositories/__init__.py`를 아래로 바꾼다.

```python
"""Persistence interfaces used by services and engines."""

from app.db.repositories.loan_product_repository import (
    build_loan_candidates,
    fetch_loan_product_candidates,
)
from app.db.repositories.region_price_repository import (
    build_region_price_reference,
    fetch_region_name,
    fetch_region_price_rows,
)
from app.db.repositories.savings_product_repository import (
    build_savings_candidates,
    fetch_savings_product_candidates,
)

__all__ = [
    "build_loan_candidates",
    "build_region_price_reference",
    "build_savings_candidates",
    "fetch_loan_product_candidates",
    "fetch_region_name",
    "fetch_region_price_rows",
    "fetch_savings_product_candidates",
]
```

- [ ] **Step 6: 통과 확인**

Run: `python -m pytest tests/db/test_region_price_repository.py -v`
Expected: PASS — 7개 테스트 전부

- [ ] **Step 7: 커밋**

```bash
git add app/schemas/property_price.py app/db/repositories/ tests/db/test_region_price_repository.py
git commit -m "feat(schemas): 지역 시세 계약과 apt_price_stats 리포지토리를 추가한다"
```

---

### Task 3: core 서비스 공급자 스위치

**Files:**
- Create: `app/services/region_price.py`
- Test: `tests/services/test_region_price.py`

**Interfaces:**
- Consumes: Task 1의 `Settings.region_price_provider`, Task 2의 `build_region_price_reference`·`fetch_region_name`·`fetch_region_price_rows`
- Produces:
  - `class RegionPriceUnavailable(RuntimeError)` — 공급자 미설정 또는 DB 접근 실패
  - `class RegionNotFound(LookupError)` — `sgg_codes`에 없는 코드
  - `load_region_price_reference(sgg_code: str, *, config: Settings | None = None, engine: Engine | None = None) -> RegionPriceReference`

`loan_product_catalog.py`의 `load_configured_loan_candidates`와 같은 형태다(키워드 전용 `config`/`engine` 주입으로 테스트에서 갈아끼운다).

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/services/test_region_price.py`를 만든다.

```python
from datetime import datetime
from zoneinfo import ZoneInfo

import pytest
from sqlalchemy.exc import OperationalError

from app.core.config import Settings
from app.services.region_price import (
    RegionNotFound,
    RegionPriceUnavailable,
    load_region_price_reference,
)

SEOUL = ZoneInfo("Asia/Seoul")

ROWS = [
    {
        "area_band": "60_85",
        "trade_cnt": 342,
        "median_price_won": 2_280_000_000,
        "p25_price_won": 1_900_000_000,
        "p75_price_won": 2_700_000_000,
        "median_ppp_won": 30_000_000,
        "is_reliable": True,
        "computed_at": datetime(2026, 7, 30, 9, 0, tzinfo=SEOUL),
    }
]


class FakeResult:
    def __init__(self, rows: list[dict]) -> None:
        self._rows = rows

    def mappings(self) -> list[dict]:
        return self._rows

    def scalar_one_or_none(self):
        return self._rows[0] if self._rows else None


class FakeConnection:
    """execute 호출 순서대로 준비된 결과를 돌려준다(1: 구 이름, 2: 시세 행)."""

    def __init__(self, results: list[FakeResult]) -> None:
        self._results = results
        self.executed: list[dict] = []

    def execute(self, _statement, parameters=None):
        self.executed.append(parameters or {})
        return self._results.pop(0)

    def __enter__(self) -> "FakeConnection":
        return self

    def __exit__(self, *_args) -> None:
        return None


class FakeEngine:
    def __init__(self, connection: FakeConnection) -> None:
        self._connection = connection

    def connect(self) -> FakeConnection:
        return self._connection


class BrokenEngine:
    def connect(self):
        raise OperationalError("SELECT 1", {}, Exception("connection refused"))


def _config(provider: str) -> Settings:
    return Settings(_env_file=None).model_copy(update={"region_price_provider": provider})


def test_disabled_provider_raises_unavailable() -> None:
    with pytest.raises(RegionPriceUnavailable):
        load_region_price_reference("11680", config=_config("disabled"))


def test_database_provider_returns_reference() -> None:
    connection = FakeConnection([FakeResult(["강남구"]), FakeResult(ROWS)])

    reference = load_region_price_reference(
        "11680", config=_config("database"), engine=FakeEngine(connection)
    )

    assert reference.sgg_name == "강남구"
    assert reference.bands[0].median_price_won == 2_280_000_000
    # 두 쿼리 모두 같은 코드로 파라미터 바인딩됐는지 확인한다.
    assert connection.executed == [{"sgg_code": "11680"}, {"sgg_code": "11680"}]


def test_unknown_region_raises_not_found() -> None:
    connection = FakeConnection([FakeResult([])])

    with pytest.raises(RegionNotFound):
        load_region_price_reference(
            "11999", config=_config("database"), engine=FakeEngine(connection)
        )


def test_known_region_without_stats_returns_empty_bands() -> None:
    connection = FakeConnection([FakeResult(["종로구"]), FakeResult([])])

    reference = load_region_price_reference(
        "11110", config=_config("database"), engine=FakeEngine(connection)
    )

    # 없는 구(404)와 구별돼야 한다 — 이쪽은 정상 응답이다.
    assert reference.sgg_name == "종로구"
    assert reference.bands == ()
    assert reference.computed_at is None


def test_connection_failure_raises_unavailable() -> None:
    with pytest.raises(RegionPriceUnavailable):
        load_region_price_reference(
            "11680", config=_config("database"), engine=BrokenEngine()
        )
```

- [ ] **Step 2: 실패 확인**

Run: `python -m pytest tests/services/test_region_price.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.region_price'`

- [ ] **Step 3: 서비스 작성**

`app/services/region_price.py`:

```python
"""설정된 시세 공급자를 하나의 계약 뒤로 감춘다."""

from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import Settings, get_settings
from app.db.repositories import (
    build_region_price_reference,
    fetch_region_name,
    fetch_region_price_rows,
)
from app.db.session import DatabaseConfigurationError, get_database_engine
from app.schemas.property_price import RegionPriceReference


class RegionPriceUnavailable(RuntimeError):
    """공급자가 없거나 DB에 닿지 못했다. 데이터 없음과 구별된다."""


class RegionNotFound(LookupError):
    """형식은 맞지만 `sgg_codes`에 없는 코드."""


def load_region_price_reference(
    sgg_code: str,
    *,
    config: Settings | None = None,
    engine: Engine | None = None,
) -> RegionPriceReference:
    """자치구 시세를 읽는다. JSON 폴백은 두지 않는다 — 가짜 시세는 위험하다."""

    resolved = config or get_settings()
    if resolved.region_price_provider != "database":
        raise RegionPriceUnavailable("the region price provider is not configured")

    try:
        database_engine = engine or get_database_engine()
        with database_engine.connect() as connection:
            sgg_name = fetch_region_name(connection, sgg_code)
            if sgg_name is None:
                raise RegionNotFound(sgg_code)
            rows = fetch_region_price_rows(connection, sgg_code)
    except (DatabaseConfigurationError, SQLAlchemyError) as exc:
        raise RegionPriceUnavailable(
            "the configured database region-price provider is unavailable"
        ) from exc

    return build_region_price_reference(sgg_code, sgg_name, rows)


__all__ = [
    "RegionNotFound",
    "RegionPriceUnavailable",
    "load_region_price_reference",
]
```

`RegionNotFound`는 `except` 절이 잡는 두 예외 어디에도 속하지 않으므로 그대로 밖으로 나간다. 이것이 의도다 — 없는 구는 연결 실패가 아니다.

- [ ] **Step 4: 통과 확인**

Run: `python -m pytest tests/services/test_region_price.py -v`
Expected: PASS — 5개 테스트

- [ ] **Step 5: 커밋**

```bash
git add app/services/region_price.py tests/services/test_region_price.py
git commit -m "feat(services): 시세 공급자 스위치를 추가한다"
```

---

### Task 4: core 엔드포인트

**Files:**
- Modify: `app/api/routes/properties.py`
- Test: `tests/api/test_region_price_endpoint.py`
  (`tests/services/test_region_price.py`와 basename이 겹치면 안 된다 — 테스트
  하위 디렉터리에 `__init__.py`가 없어 pytest가 두 모듈을 구분하지 못하고
  `import file mismatch`로 수집이 중단된다)

**Interfaces:**
- Consumes: Task 3의 `load_region_price_reference`·`RegionPriceUnavailable`·`RegionNotFound`
- Produces: `GET {api_prefix}/properties/price-reference?sgg_code=NNNNN`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/api/test_region_price_endpoint.py`를 만든다. 기존 `tests/api/test_property_search.py`의 클라이언트 구성 방식을 그대로 따른다.

```python
from datetime import datetime
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient

from app.api.routes.properties import get_region_price_reference_loader
from app.core.config import settings
from app.main import app
from app.schemas.property_price import AreaBand, RegionPriceBand, RegionPriceReference
from app.services.region_price import RegionNotFound, RegionPriceUnavailable

SEOUL = ZoneInfo("Asia/Seoul")
PRICE_URL = f"{settings.api_prefix}/properties/price-reference"

REFERENCE = RegionPriceReference(
    sgg_code="11680",
    sgg_name="강남구",
    computed_at=datetime(2026, 7, 30, 9, 0, tzinfo=SEOUL),
    bands=(
        RegionPriceBand(
            area_band=AreaBand.LT40,
            trade_count=87,
            median_price_won=920_000_000,
            p25_price_won=800_000_000,
            p75_price_won=1_050_000_000,
            median_price_per_pyeong_won=25_000_000,
            is_reliable=True,
        ),
    ),
)


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _override(loader) -> None:
    app.dependency_overrides[get_region_price_reference_loader] = lambda: loader


def test_returns_reference_for_a_seoul_district(client) -> None:
    _override(lambda sgg_code: REFERENCE)

    response = client.get(PRICE_URL, params={"sgg_code": "11680"})

    assert response.status_code == 200
    body = response.json()
    assert body["sgg_name"] == "강남구"
    assert body["stat_level"] == "sgg_all"
    assert body["schema_version"] == "1.0.0"
    assert body["bands"][0]["area_band"] == "lt40"
    assert body["bands"][0]["median_price_won"] == 920_000_000


@pytest.mark.parametrize("bad_code", ["ALL", "26440", "abc", "1168", "116800"])
def test_rejects_codes_that_are_not_seoul_district_codes(client, bad_code) -> None:
    response = client.get(PRICE_URL, params={"sgg_code": bad_code})

    assert response.status_code == 422


def test_missing_sgg_code_is_rejected(client) -> None:
    assert client.get(PRICE_URL).status_code == 422


def test_unknown_district_returns_404(client) -> None:
    def loader(sgg_code: str):
        raise RegionNotFound(sgg_code)

    _override(loader)

    response = client.get(PRICE_URL, params={"sgg_code": "11999"})

    assert response.status_code == 404


def test_unavailable_provider_returns_503(client) -> None:
    def loader(sgg_code: str):
        raise RegionPriceUnavailable("disabled")

    _override(loader)

    response = client.get(PRICE_URL, params={"sgg_code": "11680"})

    assert response.status_code == 503
    # 접속 정보가 응답 본문을 타고 나가면 안 된다.
    assert "disabled" not in response.json()["detail"]


def test_district_without_stats_returns_200_with_empty_bands(client) -> None:
    empty = RegionPriceReference(sgg_code="11110", sgg_name="종로구", bands=())
    _override(lambda sgg_code: empty)

    response = client.get(PRICE_URL, params={"sgg_code": "11110"})

    assert response.status_code == 200
    assert response.json()["bands"] == []
    assert response.json()["computed_at"] is None
```

- [ ] **Step 2: 실패 확인**

Run: `python -m pytest tests/api/test_region_price.py -v`
Expected: FAIL — `ImportError: cannot import name 'get_region_price_reference_loader'`

- [ ] **Step 3: 엔드포인트 추가**

`app/api/routes/properties.py`의 import 블록에 추가한다.

```python
from collections.abc import Callable

from fastapi import Query

from app.schemas.property_price import RegionPriceReference
from app.services.region_price import (
    RegionNotFound,
    RegionPriceUnavailable,
    load_region_price_reference,
)
```

파일 끝에 추가한다.

```python
def get_region_price_reference_loader() -> Callable[[str], RegionPriceReference]:
    """테스트가 DB 없이 갈아끼울 수 있도록 조회 함수를 의존성으로 노출한다."""

    return load_region_price_reference


@router.get("/price-reference", response_model=RegionPriceReference)
def read_region_price_reference(
    sgg_code: Annotated[
        str,
        # 형식만 코드로 막는다. 25개 구 목록의 정본은 DB의 sgg_codes이며,
        # 상수로 복제하면 DB와 어긋날 때 어느 쪽이 맞는지 알 수 없다.
        Query(pattern=r"^11\d{3}$", description="서울 자치구 시군구 코드"),
    ],
    loader: Annotated[
        Callable[[str], RegionPriceReference],
        Depends(get_region_price_reference_loader),
    ],
) -> RegionPriceReference:
    """자치구 단위 평형대별 시세를 돌려준다(`stat_level='sgg_all'`)."""

    try:
        return loader(sgg_code)
    except RegionNotFound as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 시군구 코드를 찾을 수 없습니다.",
        ) from exc
    except RegionPriceUnavailable as exc:
        logger.error("failed to load the configured region-price provider", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="시세 데이터를 불러올 수 없습니다.",
        ) from exc
```

- [ ] **Step 4: 통과 확인**

Run: `python -m pytest tests/api/test_region_price.py -v`
Expected: PASS — 10개 테스트(파라미터화 5건 포함)

- [ ] **Step 5: 전체 테스트와 ruff**

Run: `ruff check app tests && python -m pytest -q`
Expected: 기존 테스트를 포함해 전부 통과

- [ ] **Step 6: 커밋**

```bash
git add app/api/routes/properties.py tests/api/test_region_price.py
git commit -m "feat(api): 자치구 시세 조회 엔드포인트를 추가한다"
```

---

### Task 5: core 실제 스키마 점검 스크립트

**Files:**
- Create: `scripts/check_region_price_db.py`

**Interfaces:**
- Consumes: Task 2의 리포지토리 SQL, Task 3의 서비스
- Produces: 없음(운영 도구)

이 스크립트가 필요한 이유: **구현 시점에 개발 환경에서 DB에 접속할 수 없다.** 자동 테스트는 전부 가짜 커넥션 기반이므로, SQL이 실제 테이블과 맞는지는 검증되지 않은 상태다. 비밀번호를 넣고 터널을 연 뒤 이 스크립트를 한 번 돌리면 그 간극이 닫힌다.

- [ ] **Step 1: 스크립트 작성**

`scripts/check_region_price_db.py`:

```python
#!/usr/bin/env python
"""실제 DB가 db_schema_realestate.md와 맞는지 확인한다(읽기 전용).

    python scripts/check_region_price_db.py 11680

터널을 먼저 열어야 한다 — docs/LOCAL_DB_TUNNEL.md 참고.
"""

import sys

from sqlalchemy import inspect, text

from app.core.config import get_settings
from app.db.session import get_database_engine
from app.services.region_price import load_region_price_reference

EXPECTED_COLUMNS = {
    "stat_level",
    "scope_cd",
    "area_band",
    "period_key",
    "trade_cnt",
    "median_price_won",
    "p25_price_won",
    "p75_price_won",
    "median_ppp_won",
    "is_reliable",
    "computed_at",
}


def main(sgg_code: str) -> int:
    config = get_settings()
    print(f"공급자      : {config.region_price_provider}")
    print(f"접속 대상   : {config.database_host}:{config.database_port}/{config.database_name}")
    print("(비밀번호는 출력하지 않습니다)\n")

    engine = get_database_engine()
    with engine.connect() as connection:
        print("1) 연결 : OK")

        inspector = inspect(engine)
        # apt_price_stats는 MATERIALIZED VIEW다. PostgreSQL에서 get_view_names()는
        # 일반 뷰만 돌려주므로, 이것만 보면 존재하는 객체를 "없음"으로 오판한다.
        tables = (
            set(inspector.get_table_names())
            | set(inspector.get_view_names())
            | set(inspector.get_materialized_view_names())
        )
        for table in ("sgg_codes", "apt_price_stats"):
            mark = "OK" if table in tables else "없음"
            print(f"2) {table:16s}: {mark}")
        if "apt_price_stats" not in tables:
            print("\napt_price_stats가 없습니다. 적재 상태를 확인하세요.")
            return 1

        actual = {column["name"] for column in inspector.get_columns("apt_price_stats")}
        missing = EXPECTED_COLUMNS - actual
        print(f"3) 컬럼 일치: {'OK' if not missing else '불일치'}")
        if missing:
            print(f"   문서에 있으나 DB에 없음: {sorted(missing)}")
            print(f"   DB의 실제 컬럼        : {sorted(actual)}")
            return 1

        count = connection.execute(
            text("SELECT count(*) FROM apt_price_stats WHERE stat_level = 'sgg_all'")
        ).scalar_one()
        print(f"4) sgg_all 행수: {count} (문서 기준 125)")

    reference = load_region_price_reference(sgg_code)
    print(f"\n5) {reference.sgg_name}({reference.sgg_code}) · 기준 {reference.computed_at}")
    if not reference.bands:
        print("   통계 행이 없습니다.")
    for band in reference.bands:
        flag = "" if band.is_reliable else "  [표본 부족]"
        print(
            f"   {band.area_band.value:8s} "
            f"중위 {band.median_price_won:>15,}원  "
            f"{band.trade_count:>5}건{flag}"
        )
    return 0


if __name__ == "__main__":
    code = sys.argv[1] if len(sys.argv) > 1 else "11680"
    try:
        raise SystemExit(main(code))
    except Exception as exc:  # noqa: BLE001 — 운영 도구이므로 원인을 그대로 보여준다
        print(f"\n실패: {type(exc).__name__}: {exc}")
        print("터널이 열려 있는지(pg_isready -h localhost -p 15432), "
              ".env의 REGION_PRICE_PROVIDER=database 인지 확인하세요.")
        raise SystemExit(1) from exc
```

- [ ] **Step 2: import 경로 확인**

DB 없이도 모듈이 로드되는지만 본다.

Run: `python -c "import ast,sys; ast.parse(open('scripts/check_region_price_db.py').read()); print('구문 OK')"`
Expected: `구문 OK`

- [ ] **Step 3: ruff**

Run: `ruff check scripts`
Expected: 통과

- [ ] **Step 4: 커밋**

```bash
git add scripts/check_region_price_db.py
git commit -m "chore(scripts): 실제 시세 스키마 점검 스크립트를 추가한다"
```

---

### Task 6: web API 클라이언트

**Files:**
- Create: `src/lib/api/region-price.ts`
- Test: `src/lib/api/region-price.test.ts`

**Interfaces:**
- Consumes: 기존 `apiRequest`(`src/lib/api/client.ts`)
- Produces:
  - `type AreaBand = "lt40" | "40_60" | "60_85" | "85_135" | "gte135"`
  - `AREA_BAND_LABELS: Record<AreaBand, string>`
  - `type RegionPriceBand`, `type RegionPriceReference`
  - `fetchRegionPrice(sggCode: string, signal?: AbortSignal): Promise<RegionPriceReference>`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/api/region-price.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AREA_BAND_LABELS,
  type RegionPriceReference,
  fetchRegionPrice,
} from "./region-price";

const REFERENCE: RegionPriceReference = {
  schema_version: "1.0.0",
  sgg_code: "11680",
  sgg_name: "강남구",
  stat_level: "sgg_all",
  computed_at: "2026-07-30T09:00:00+09:00",
  bands: [
    {
      area_band: "60_85",
      trade_count: 342,
      median_price_won: 2_280_000_000,
      p25_price_won: 1_900_000_000,
      p75_price_won: 2_700_000_000,
      median_price_per_pyeong_won: 30_000_000,
      is_reliable: true,
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(REFERENCE), { status: 200 })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchRegionPrice", () => {
  it("시군구 코드를 질의 문자열로 붙인다", async () => {
    await fetchRegionPrice("11680");

    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain(
      "/api/v1/properties/price-reference?sgg_code=11680",
    );
  });

  it("응답을 그대로 돌려준다", async () => {
    const reference = await fetchRegionPrice("11680");

    expect(reference.sgg_name).toBe("강남구");
    expect(reference.bands[0]?.median_price_won).toBe(2_280_000_000);
  });

  it("전달받은 signal을 fetch에 넘긴다", async () => {
    const controller = new AbortController();

    await fetchRegionPrice("11680", controller.signal);

    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(init?.signal).toBe(controller.signal);
  });

  it("오류 응답이면 던진다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ detail: "시세 데이터를 불러올 수 없습니다." }), {
            status: 503,
          }),
      ),
    );

    await expect(fetchRegionPrice("11680")).rejects.toThrow(
      "시세 데이터를 불러올 수 없습니다.",
    );
  });
});

describe("AREA_BAND_LABELS", () => {
  it("5개 구간 전부에 한글 라벨이 있다", () => {
    expect(Object.keys(AREA_BAND_LABELS)).toEqual([
      "lt40",
      "40_60",
      "60_85",
      "85_135",
      "gte135",
    ]);
    expect(AREA_BAND_LABELS.lt40).toBe("40㎡ 미만");
    expect(AREA_BAND_LABELS.gte135).toBe("135㎡ 이상");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd /Users/programming/housing-finance-system/housing-finance-web && npx vitest run src/lib/api/region-price.test.ts`
Expected: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 3: 클라이언트 작성**

`src/lib/api/region-price.ts`:

```ts
import { apiRequest } from "./client";

/** core의 `AreaBand`와 값이 같아야 한다(`app/schemas/property_price.py`). */
export type AreaBand = "lt40" | "40_60" | "60_85" | "85_135" | "gte135";

/**
 * 선언 순서가 곧 크기 순서다. 서버가 이미 이 순서로 정렬해 보내지만, 화면이
 * 자체 순서를 갖고 있어야 서버 정렬이 깨졌을 때도 표가 뒤섞이지 않는다.
 */
export const AREA_BAND_LABELS: Record<AreaBand, string> = {
  lt40: "40㎡ 미만",
  "40_60": "40~60㎡",
  "60_85": "60~85㎡",
  "85_135": "85~135㎡",
  gte135: "135㎡ 이상",
};

export type RegionPriceBand = {
  area_band: AreaBand;
  trade_count: number;
  median_price_won: number;
  p25_price_won: number;
  p75_price_won: number;
  /** 전용면적 기준이다. 공급면적 기준 시장 평단가보다 20~30% 낮다. */
  median_price_per_pyeong_won: number | null;
  is_reliable: boolean;
};

export type RegionPriceReference = {
  schema_version: "1.0.0";
  sgg_code: string;
  sgg_name: string;
  stat_level: "sgg_all";
  /** 통계 행이 없으면 null이다. */
  computed_at: string | null;
  bands: RegionPriceBand[];
};

export function fetchRegionPrice(
  sggCode: string,
  signal?: AbortSignal,
): Promise<RegionPriceReference> {
  return apiRequest<RegionPriceReference>(
    `/api/v1/properties/price-reference?sgg_code=${encodeURIComponent(sggCode)}`,
    { signal },
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/api/region-price.test.ts`
Expected: PASS — 5개 테스트

- [ ] **Step 5: 커밋**

```bash
git add src/lib/api/region-price.ts src/lib/api/region-price.test.ts
git commit -m "feat(api): 지역 시세 조회 클라이언트를 추가한다"
```

---

### Task 7: web 시세 표 컴포넌트

**Files:**
- Create: `src/features/input/region-price-table.tsx`
- Test: `src/features/input/region-price-table.test.tsx`

**Interfaces:**
- Consumes: Task 6의 `fetchRegionPrice`·`AREA_BAND_LABELS`·`RegionPriceReference`; 기존 `formatKoreanUnit`(`@/lib/format/money`); 기존 `ALL_DISTRICTS`(`@/lib/constants/seoul-districts`)
- Produces: `RegionPriceTable({ sggCode, onSelectPrice }: { sggCode: string; onSelectPrice: (won: number) => void })`

폼을 직접 건드리지 않고 `onSelectPrice` 콜백만 부르게 한다. 표는 표시와 선택만 알고, 어느 필드에 넣을지는 Task 8이 정한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/features/input/region-price-table.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RegionPriceReference } from "@/lib/api/region-price";

import { RegionPriceTable } from "./region-price-table";

const { fetchRegionPrice } = vi.hoisted(() => ({ fetchRegionPrice: vi.fn() }));

vi.mock("@/lib/api/region-price", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/region-price")>()),
  fetchRegionPrice,
}));

const REFERENCE: RegionPriceReference = {
  schema_version: "1.0.0",
  sgg_code: "11680",
  sgg_name: "강남구",
  stat_level: "sgg_all",
  computed_at: "2026-07-30T09:00:00+09:00",
  bands: [
    {
      area_band: "lt40",
      trade_count: 87,
      median_price_won: 920_000_000,
      p25_price_won: 800_000_000,
      p75_price_won: 1_050_000_000,
      median_price_per_pyeong_won: 25_000_000,
      is_reliable: true,
    },
    {
      area_band: "gte135",
      trade_count: 3,
      median_price_won: 4_500_000_000,
      p25_price_won: 4_000_000_000,
      p75_price_won: 5_000_000_000,
      median_price_per_pyeong_won: 32_000_000,
      is_reliable: false,
    },
  ],
};

beforeEach(() => {
  fetchRegionPrice.mockReset();
  fetchRegionPrice.mockResolvedValue(REFERENCE);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("RegionPriceTable", () => {
  it("지역이 선택되지 않으면 조회하지 않는다", () => {
    render(<RegionPriceTable sggCode="" onSelectPrice={vi.fn()} />);

    expect(fetchRegionPrice).not.toHaveBeenCalled();
  });

  it("전체를 고르면 조회하지 않고 안내만 보여준다", () => {
    render(<RegionPriceTable sggCode="ALL" onSelectPrice={vi.fn()} />);

    // 25개 구 중위값을 다시 중위내면 틀린 값이 되므로 아예 조회하지 않는다.
    expect(fetchRegionPrice).not.toHaveBeenCalled();
    expect(screen.getByText(/구를 선택하면/)).toBeInTheDocument();
  });

  it("구를 고르면 평형대별 중위가격을 보여준다", async () => {
    render(<RegionPriceTable sggCode="11680" onSelectPrice={vi.fn()} />);

    expect(await screen.findByText("40㎡ 미만")).toBeInTheDocument();
    expect(screen.getByText("9억 2,000만원")).toBeInTheDocument();
    expect(screen.getByText("135㎡ 이상")).toBeInTheDocument();
  });

  it("표본이 부족한 구간도 숨기지 않고 표시한다", async () => {
    render(<RegionPriceTable sggCode="11680" onSelectPrice={vi.fn()} />);

    expect(await screen.findByText(/표본 부족/)).toBeInTheDocument();
  });

  it("행을 누르면 중위가격을 콜백으로 넘긴다", async () => {
    const user = userEvent.setup();
    const onSelectPrice = vi.fn();
    render(<RegionPriceTable sggCode="11680" onSelectPrice={onSelectPrice} />);

    await user.click(await screen.findByRole("button", { name: /40㎡ 미만/ }));

    expect(onSelectPrice).toHaveBeenCalledWith(920_000_000);
  });

  it("통계가 없으면 없다고 말한다", async () => {
    fetchRegionPrice.mockResolvedValue({ ...REFERENCE, computed_at: null, bands: [] });

    render(<RegionPriceTable sggCode="11110" onSelectPrice={vi.fn()} />);

    expect(await screen.findByText(/시세 통계가 아직 없습니다/)).toBeInTheDocument();
  });

  it("조회에 실패해도 직접 입력할 수 있다고 안내한다", async () => {
    fetchRegionPrice.mockRejectedValue(new Error("시세 데이터를 불러올 수 없습니다."));

    render(<RegionPriceTable sggCode="11680" onSelectPrice={vi.fn()} />);

    expect(await screen.findByText(/직접 입력할 수 있습니다/)).toBeInTheDocument();
  });

  it("지역이 바뀌면 이전 요청을 취소한다", async () => {
    const { rerender } = render(
      <RegionPriceTable sggCode="11680" onSelectPrice={vi.fn()} />,
    );

    rerender(<RegionPriceTable sggCode="11110" onSelectPrice={vi.fn()} />);

    await waitFor(() => expect(fetchRegionPrice).toHaveBeenCalledTimes(2));
    const firstSignal = fetchRegionPrice.mock.calls[0]![1] as AbortSignal;
    // 취소하지 않으면 늦게 온 이전 응답이 새 지역의 표를 덮어쓴다.
    expect(firstSignal.aborted).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/features/input/region-price-table.test.tsx`
Expected: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 3: 컴포넌트 작성**

`src/features/input/region-price-table.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

import {
  AREA_BAND_LABELS,
  type RegionPriceReference,
  fetchRegionPrice,
} from "@/lib/api/region-price";
import { ALL_DISTRICTS } from "@/lib/constants/seoul-districts";
import { formatKoreanUnit } from "@/lib/format/money";

type State =
  | { kind: "idle" }
  | { kind: "all" }
  | { kind: "loading" }
  | { kind: "ready"; reference: RegionPriceReference }
  | { kind: "error" };

export function RegionPriceTable({
  sggCode,
  onSelectPrice,
}: {
  sggCode: string;
  onSelectPrice: (won: number) => void;
}) {
  const [state, setState] = useState<State>({ kind: "idle" });

  useEffect(() => {
    if (sggCode === "") {
      setState({ kind: "idle" });
      return;
    }
    // 서울 전체는 조회하지 않는다 — apt_price_stats에 서울 단위 grain이 없고,
    // 25개 구의 중위값을 다시 중위내는 것은 전체 중위값이 아니다.
    if (sggCode === ALL_DISTRICTS) {
      setState({ kind: "all" });
      return;
    }

    const controller = new AbortController();
    setState({ kind: "loading" });

    fetchRegionPrice(sggCode, controller.signal)
      .then((reference) => {
        if (controller.signal.aborted) return;
        setState({ kind: "ready", reference });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setState({ kind: "error" });
      });

    // 지역을 빠르게 연달아 바꾸면 응답이 순서를 어겨 도착할 수 있다.
    // 취소하지 않으면 늦게 온 이전 지역의 시세가 새 지역의 표를 덮어쓴다.
    return () => controller.abort();
  }, [sggCode]);

  if (state.kind === "idle") return null;

  if (state.kind === "all") {
    return <Note>구를 선택하면 해당 지역 시세를 보여드립니다.</Note>;
  }

  if (state.kind === "loading") {
    return <Note>시세를 불러오는 중…</Note>;
  }

  if (state.kind === "error") {
    return (
      <Note>시세를 불러오지 못했습니다. 금액은 직접 입력할 수 있습니다.</Note>
    );
  }

  const { reference } = state;

  if (reference.bands.length === 0) {
    return <Note>이 지역의 시세 통계가 아직 없습니다.</Note>;
  }

  return (
    <section className="grid gap-2" aria-label={`${reference.sgg_name} 시세`}>
      <p className="text-xs text-brand-muted">
        {reference.sgg_name} 시세 · 최근 1년 중위값 · 전용면적 기준
        {reference.computed_at
          ? ` · ${reference.computed_at.slice(0, 10)} 기준`
          : ""}
      </p>

      <ul className="grid gap-1">
        {reference.bands.map((band) => (
          <li key={band.area_band}>
            <button
              type="button"
              onClick={() => onSelectPrice(band.median_price_won)}
              className="flex w-full items-baseline justify-between gap-3 rounded-lg border border-line px-3 py-2 text-left text-sm hover:bg-surface"
            >
              <span>{AREA_BAND_LABELS[band.area_band]}</span>
              <span className="font-semibold">
                {formatKoreanUnit(band.median_price_won)}
              </span>
              <span className="text-xs text-brand-muted">
                {band.trade_count}건
                {band.is_reliable ? "" : " · 표본 부족"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Note({ children }: { children: string }) {
  return <p className="text-xs text-brand-muted">{children}</p>;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/features/input/region-price-table.test.tsx`
Expected: PASS — 8개 테스트

- [ ] **Step 5: 커밋**

```bash
git add src/features/input/region-price-table.tsx src/features/input/region-price-table.test.tsx
git commit -m "feat(input): 평형대별 시세 표를 추가한다"
```

---

### Task 8: web 패널 통합

**Files:**
- Modify: `src/features/input/desired-home-panel.tsx`
- Test: `src/features/input/desired-home-panel.test.tsx` (기존 파일에 추가)

**Interfaces:**
- Consumes: Task 7의 `RegionPriceTable`
- Produces: 없음(최종 화면)

- [ ] **Step 1: 기존 테스트를 깨지 않는지 먼저 확인**

`desired-home-panel.test.tsx`는 `@/lib/map/kakao-loader`만 목으로 두고 있다. `RegionPriceTable`이 들어오면 실제 `fetch`가 불릴 수 있으므로 **기존 파일 맨 위에 목을 추가한다.**

```tsx
const { fetchRegionPrice } = vi.hoisted(() => ({ fetchRegionPrice: vi.fn() }));

vi.mock("@/lib/api/region-price", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/region-price")>()),
  fetchRegionPrice,
}));
```

그리고 기존 `beforeEach` 안에 추가한다.

```tsx
  fetchRegionPrice.mockReset();
  fetchRegionPrice.mockResolvedValue({
    schema_version: "1.0.0",
    sgg_code: "11650",
    sgg_name: "서초구",
    stat_level: "sgg_all",
    computed_at: "2026-07-30T09:00:00+09:00",
    bands: [
      {
        area_band: "60_85",
        trade_count: 210,
        median_price_won: 1_800_000_000,
        p25_price_won: 1_500_000_000,
        p75_price_won: 2_100_000_000,
        median_price_per_pyeong_won: 28_000_000,
        is_reliable: true,
      },
    ],
  });
```

- [ ] **Step 2: 실패하는 테스트 작성**

같은 파일 끝에 `describe` 블록을 추가한다.

```tsx
describe("DesiredHomePanel 시세", () => {
  it("선택된 지역의 시세를 조회한다", async () => {
    await renderPanel();

    // persona_e는 11650(서초구)로 프리필된다.
    await waitFor(() =>
      expect(fetchRegionPrice).toHaveBeenCalledWith("11650", expect.anything()),
    );
  });

  it("시세 행을 누르면 목표 가격이 채워진다", async () => {
    const user = userEvent.setup();
    await renderPanel();

    await user.click(await screen.findByRole("button", { name: /60~85㎡/ }));

    expect(screen.getByLabelText("목표 가격 (원)")).toHaveValue(1_800_000_000);
  });

  it("시세 표는 지도 바깥에 있다", async () => {
    await renderPanel();

    const map = screen.getByRole("region", { name: "대한민국 지도" });
    const table = await screen.findByRole("region", { name: /시세/ });

    expect(map.contains(table)).toBe(false);
  });
});
```

`waitFor`를 쓰므로 파일 상단 import에 추가한다: `import { render, screen, waitFor } from "@testing-library/react";`

- [ ] **Step 3: 실패 확인**

Run: `npx vitest run src/features/input/desired-home-panel.test.tsx`
Expected: FAIL — `fetchRegionPrice`가 호출되지 않음

- [ ] **Step 4: 패널에 표 넣기**

`desired-home-panel.tsx`를 수정한다. `useFormContext`에서 `setValue`를 꺼내고, 2열 그리드와 지도 **사이**에 표를 놓는다.

```tsx
export function DesiredHomePanel({ id }: { id: string }) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<InputFormValues>();

  const targetRegion = watch("target_region");

  return (
    <div id={id} className="grid gap-4">
      {/* 목표 시점·위험 성향과 같은 2열 그리드를 한 벌 더 쓴다.
          열 너비가 정확히 일치해야 "같은 형식"이 된다. */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* … 기존 지역/목표 가격 FieldRow 두 개를 그대로 둔다 … */}
      </div>

      <RegionPriceTable
        sggCode={targetRegion ?? ""}
        onSelectPrice={(won) =>
          setValue("target_price", won, { shouldValidate: true })
        }
      />

      <KakaoMap className="h-[260px] md:h-[360px]" />
    </div>
  );
}
```

import를 추가한다:

```tsx
import { RegionPriceTable } from "./region-price-table";
```

`shouldValidate: true`를 주는 이유: 이 값이 들어오면 `목표 가격`의 기존 검증 오류가 즉시 지워져야 한다. 그러지 않으면 값은 채워졌는데 빨간 오류가 남는다.

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run src/features/input/desired-home-panel.test.tsx`
Expected: PASS — 기존 8개 + 신규 3개

- [ ] **Step 6: 전체 검증**

Run: `npm test && npm run typecheck && npm run build`
Expected: 전부 통과. 기존 테스트가 깨지면 **고치기 전에 원인을 확인한다** — `input-wizard.test.tsx`도 패널을 열므로 같은 목이 필요할 수 있다.

- [ ] **Step 7: 커밋**

```bash
git add src/features/input/desired-home-panel.tsx src/features/input/desired-home-panel.test.tsx
git commit -m "feat(input): 희망 주택 패널에 시세 표를 연결한다"
```

---

## 마무리 확인

모든 태스크가 끝나면 다음을 확인한다.

- [ ] core: `ruff check app tests && ruff check scripts && python -m pytest -q`
  (CI는 `app tests`만 검사한다 — `scripts`는 로컬에서 따로 본다)
- [ ] web: `npm test && npm run typecheck && npm run build`
- [ ] `git status`로 **`.env`가 추적되지 않는지** 확인(두 저장소 모두)
- [ ] `git log -p`에 실제 호스트·계정·비밀번호가 없는지 확인
- [ ] `.env.example`의 DB 항목 값이 비어 있는지 확인

**실제 DB 검증은 사용자 몫으로 남는다.** 터널을 연 뒤:

```bash
python scripts/check_region_price_db.py 11680
```

이 스크립트가 문서와 실물의 차이를 짚는다. 컬럼명이 다르면 Task 2의 SQL만 고치면 된다 — 나머지 계층은 컬럼명을 모른다.
