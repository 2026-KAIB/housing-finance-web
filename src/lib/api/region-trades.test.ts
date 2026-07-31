import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_TRADE_SORT,
  TRADE_SORT_OPTIONS,
  type RegionTradePage,
  fetchRegionTrades,
} from "./region-trades";

const PAGE: RegionTradePage = {
  schema_version: "1.0.0",
  sgg_code: "11680",
  sgg_name: "강남구",
  sort: "area_asc",
  page: 1,
  page_size: 5,
  total_count: 2994,
  total_pages: 599,
  trades: [
    {
      trade_id: 42,
      apt_name: "청담스위트",
      umd_name: "청담동",
      road_name: "학동로73길",
      build_year: 2015,
      exclusive_area_m2: "12.4500",
      floor: 2,
      contract_date: "2025-12-31",
      deal_amount_won: 185_000_000,
    },
  ],
};

function queryOf(call: number = 0): URLSearchParams {
  const [url] = vi.mocked(fetch).mock.calls[call]!;
  return new URL(String(url)).searchParams;
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(PAGE), { status: 200 })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchRegionTrades", () => {
  it("기본값은 면적 오름차순 1페이지 5개다", async () => {
    await fetchRegionTrades("11680");

    const query = queryOf();
    expect(query.get("sgg_code")).toBe("11680");
    expect(query.get("sort")).toBe("area_asc");
    expect(query.get("page")).toBe("1");
    expect(query.get("page_size")).toBe("5");
  });

  it("정렬과 페이지를 질의 문자열로 보낸다", async () => {
    await fetchRegionTrades("11680", { sort: "price_desc", page: 7 });

    const query = queryOf();
    expect(query.get("sort")).toBe("price_desc");
    expect(query.get("page")).toBe("7");
  });

  it("응답을 그대로 돌려준다", async () => {
    const page = await fetchRegionTrades("11680");

    expect(page.sgg_name).toBe("강남구");
    expect(page.total_pages).toBe(599);
    expect(page.trades[0]?.apt_name).toBe("청담스위트");
  });

  it("전달받은 signal을 fetch에 넘긴다", async () => {
    const controller = new AbortController();

    await fetchRegionTrades("11680", {}, controller.signal);

    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(init?.signal).toBe(controller.signal);
  });

  it("오류 응답이면 서버가 준 사유로 던진다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ detail: "실거래 데이터를 불러올 수 없습니다." }),
            { status: 503 },
          ),
      ),
    );

    await expect(fetchRegionTrades("11680")).rejects.toThrow(
      "실거래 데이터를 불러올 수 없습니다.",
    );
  });
});

describe("TRADE_SORT_OPTIONS", () => {
  it("요청받은 4가지 정렬을 그 순서대로 담는다", () => {
    expect(TRADE_SORT_OPTIONS.map((option) => option.label)).toEqual([
      "좁은 면적 순",
      "넓은 면적 순",
      "가격 낮은 순",
      "가격 높은 순",
    ]);
  });

  it("기본 정렬이 목록의 첫 항목이다", () => {
    expect(TRADE_SORT_OPTIONS[0]?.value).toBe(DEFAULT_TRADE_SORT);
  });
});
