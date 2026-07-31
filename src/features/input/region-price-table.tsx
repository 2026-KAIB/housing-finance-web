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

/**
 * 선택한 자치구의 평형대별 시세를 보여주고, 행을 누르면 그 중위값을 넘긴다.
 *
 * 이 표는 **제안일 뿐 목표 가격을 대체하지 않는다.** 조회가 실패하든 데이터가
 * 없든 사용자는 언제나 금액을 직접 입력할 수 있어야 한다 — 그러지 않으면 DB가
 * 죽는 순간 폼 전체가 막힌다.
 */
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
                {band.trade_count}건{band.is_reliable ? "" : " · 표본 부족"}
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
