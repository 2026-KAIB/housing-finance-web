import { apiRequest } from "./client";

/**
 * core의 `AreaBand`와 값이 정확히 같아야 한다
 * (`app/schemas/property_price.py`).
 */
export type AreaBand = "lt40" | "40_60" | "60_85" | "85_135" | "gte135";

/**
 * 선언 순서가 곧 크기 순서다. 서버가 이미 이 순서로 정렬해 보내지만, 화면이
 * 자체 순서를 갖고 있어야 서버 정렬이 깨져도 표가 뒤섞이지 않는다.
 *
 * 값 문자열을 사전순으로 정렬하면 `40_60 < 60_85 < 85_135 < gte135 < lt40`이
 * 되어 가장 작은 평형이 맨 뒤로 간다.
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
  /** 표본 5건 이상 + 최신 2개월 아님. false여도 숨기지 않는다. */
  is_reliable: boolean;
};

export type RegionPriceReference = {
  schema_version: "1.0.0";
  sgg_code: string;
  sgg_name: string;
  stat_level: "sgg_all";
  /** 통계 행이 하나도 없으면 null이다. */
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
