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

  it("오류 응답이면 서버가 준 사유로 던진다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ detail: "시세 데이터를 불러올 수 없습니다." }),
            { status: 503 },
          ),
      ),
    );

    await expect(fetchRegionPrice("11680")).rejects.toThrow(
      "시세 데이터를 불러올 수 없습니다.",
    );
  });
});

describe("AREA_BAND_LABELS", () => {
  it("5개 구간이 작은 평형부터 순서대로 있다", () => {
    // 이 순서가 표의 행 순서다. 사전순으로 정렬하면 lt40이 맨 뒤로 간다.
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
