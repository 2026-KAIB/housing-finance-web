"use client";

import { useEffect, useState } from "react";

import {
  DEFAULT_TRADE_SORT,
  TRADE_SORT_OPTIONS,
  type RegionTradePage,
  type TradeSort,
  fetchRegionTrades,
} from "@/lib/api/region-trades";
import { ALL_DISTRICTS } from "@/lib/constants/seoul-districts";
import { formatKoreanUnit } from "@/lib/format/money";

type State =
  | { kind: "idle" }
  | { kind: "all" }
  | { kind: "loading" }
  | { kind: "ready"; page: RegionTradePage }
  | { kind: "error" };

/**
 * 페이지 번호 목록. 1,497페이지를 다 늘어놓을 수 없으므로 양 끝과 현재 주변만
 * 남기고 `…`로 접는다.
 */
export function pageWindow(page: number, totalPages: number): (number | "…")[] {
  // 접어봐야 줄지 않는 규모면 그냥 다 보여준다 — `1 2 … 5`는 접는 의미가 없다.
  const MAX_WITHOUT_GAPS = 7;
  if (totalPages <= MAX_WITHOUT_GAPS) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const shown = [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);

  const result: (number | "…")[] = [];
  let previous = 0;
  for (const n of shown) {
    if (previous && n - previous > 1) result.push("…");
    result.push(n);
    previous = n;
  }
  return result;
}

function formatFloor(floor: number): string {
  // 지하 거래가 10건 있다. "-1층"은 층수가 아니라 오류처럼 보인다.
  return floor < 0 ? `지하 ${-floor}층` : `${floor}층`;
}

function formatArea(area: string): string {
  return `${Number(area).toFixed(2)}㎡`;
}

/**
 * 선택한 자치구의 실거래를 5개씩 보여주고, 행을 누르면 그 금액을 넘긴다.
 *
 * 이 표는 **제안일 뿐 목표 가격을 대체하지 않는다.** 조회가 실패하든 거래가
 * 없든 사용자는 언제나 금액을 직접 입력할 수 있어야 한다.
 */
export function RegionTradeTable({
  sggCode,
  onSelectPrice,
}: {
  sggCode: string;
  onSelectPrice: (won: number) => void;
}) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [sort, setSort] = useState<TradeSort>(DEFAULT_TRADE_SORT);
  const [page, setPage] = useState(1);

  // 지역이 바뀌면 페이지를 1로 되돌린다. 렌더 중 조정하는 React 권장 패턴을
  // 쓰는 이유는, 효과로 처리하면 옛 페이지로 한 번 조회한 뒤 1페이지로 다시
  // 조회해 요청이 두 번 나가기 때문이다.
  const [lastSggCode, setLastSggCode] = useState(sggCode);
  if (sggCode !== lastSggCode) {
    setLastSggCode(sggCode);
    setPage(1);
  }

  useEffect(() => {
    if (sggCode === "") {
      setState({ kind: "idle" });
      return;
    }
    // 서울 전체는 조회하지 않는다 — 75,240건 15,048페이지는 목록이 아니다.
    if (sggCode === ALL_DISTRICTS) {
      setState({ kind: "all" });
      return;
    }

    const controller = new AbortController();
    setState({ kind: "loading" });

    fetchRegionTrades(sggCode, { sort, page }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setState({ kind: "ready", page: result });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setState({ kind: "error" });
      });

    // 지역·정렬·페이지를 빠르게 연달아 바꾸면 응답이 순서를 어겨 도착할 수 있다.
    // 취소하지 않으면 늦게 온 이전 응답이 새 목록을 덮어쓴다.
    return () => controller.abort();
  }, [sggCode, sort, page]);

  if (state.kind === "idle") return null;

  if (state.kind === "all") {
    return <Note>구를 선택하면 해당 지역 실거래를 보여드립니다.</Note>;
  }

  if (state.kind === "error") {
    return (
      <Note>실거래를 불러오지 못했습니다. 금액은 직접 입력할 수 있습니다.</Note>
    );
  }

  const result = state.kind === "ready" ? state.page : null;

  return (
    <section className="grid gap-2" aria-label="실거래 목록">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-brand-muted">
          {result
            ? `${result.sgg_name} 실거래 ${result.total_count.toLocaleString("ko-KR")}건`
            : "실거래를 불러오는 중…"}
        </p>

        <label className="flex items-center gap-1.5 text-xs">
          <span className="text-brand-muted">정렬</span>
          <select
            aria-label="정렬"
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as TradeSort);
              // 정렬을 바꾸면 1페이지로. 599페이지에서 정렬만 바꾸면
              // 사용자가 맥락을 잃은 채 목록 한가운데에 떨어진다.
              setPage(1);
            }}
            className="h-8 rounded-md border border-line bg-surface px-2 text-xs"
          >
            {TRADE_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {result && result.trades.length === 0 && (
        <Note>이 지역의 실거래 기록이 없습니다.</Note>
      )}

      {result && result.trades.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {result.trades.map((trade) => (
            <li key={trade.trade_id}>
              <button
                type="button"
                onClick={() => onSelectPrice(trade.deal_amount_won)}
                className="bg-trade-gradient grid h-full w-full gap-1 rounded-lg border border-line px-3 py-3 text-left transition hover:border-brand-strong hover:bg-surface hover:shadow-md"
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold">{trade.apt_name}</span>
                  <span className="text-sm font-semibold">
                    {formatKoreanUnit(trade.deal_amount_won)}
                  </span>
                </span>
                <span className="text-xs text-brand-muted">
                  {[trade.umd_name, trade.road_name, `${trade.build_year}년`]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <span className="text-xs text-brand-muted">
                  {formatArea(trade.exclusive_area_m2)} ·{" "}
                  {formatFloor(trade.floor)} · {trade.contract_date}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {result && result.total_pages > 1 && (
        <nav aria-label="페이지" className="flex justify-center gap-1 pt-1">
          {pageWindow(result.page, result.total_pages).map((entry, index) =>
            entry === "…" ? (
              <span
                key={`gap-${index}`}
                className="px-1 text-xs text-brand-muted"
              >
                …
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                aria-label={`${entry}페이지`}
                aria-current={entry === result.page ? "page" : undefined}
                onClick={() => setPage(entry)}
                className={
                  entry === result.page
                    ? "min-w-7 rounded-md border border-line bg-surface px-1.5 py-0.5 text-xs font-semibold"
                    : "min-w-7 rounded-md px-1.5 py-0.5 text-xs text-brand-muted hover:bg-surface"
                }
              >
                {entry}
              </button>
            ),
          )}
        </nav>
      )}
    </section>
  );
}

function Note({ children }: { children: string }) {
  return <p className="text-xs text-brand-muted">{children}</p>;
}
