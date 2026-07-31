import { apiRequest } from "./client";

/** core의 `TradeSort`와 값이 정확히 같아야 한다(`app/schemas/property_trade.py`). */
export type TradeSort = "area_asc" | "area_desc" | "price_asc" | "price_desc";

/**
 * 드롭다운에 그리는 순서이자 라벨. 첫 항목이 기본 정렬이다.
 *
 * 배열로 두는 이유: 객체 키 순서에 화면 순서를 의존하지 않기 위해서다.
 */
export const TRADE_SORT_OPTIONS: ReadonlyArray<{
  value: TradeSort;
  label: string;
}> = [
  { value: "area_asc", label: "좁은 면적 순" },
  { value: "area_desc", label: "넓은 면적 순" },
  { value: "price_asc", label: "가격 낮은 순" },
  { value: "price_desc", label: "가격 높은 순" },
];

export const DEFAULT_TRADE_SORT: TradeSort = "area_asc";
export const TRADE_PAGE_SIZE = 5;

export type RegionTrade = {
  trade_id: number;
  apt_name: string;
  /** 법정동 */
  umd_name: string;
  /** 159건이 NULL이다. 없으면 화면에서 그 자리를 비운다. */
  road_name: string | null;
  build_year: number;
  /** 전용면적. 서버가 문자열로 직렬화한다(Decimal). */
  exclusive_area_m2: string;
  /** 음수일 수 있다 — 지하 거래. */
  floor: number;
  contract_date: string;
  deal_amount_won: number;
};

export type RegionTradePage = {
  schema_version: "1.0.0";
  sgg_code: string;
  sgg_name: string;
  sort: TradeSort;
  page: number;
  page_size: number;
  total_count: number;
  /** 결과가 없어도 1이다. */
  total_pages: number;
  trades: RegionTrade[];
};

export function fetchRegionTrades(
  sggCode: string,
  options: { sort?: TradeSort; page?: number; pageSize?: number } = {},
  signal?: AbortSignal,
): Promise<RegionTradePage> {
  const query = new URLSearchParams({
    sgg_code: sggCode,
    sort: options.sort ?? DEFAULT_TRADE_SORT,
    page: String(options.page ?? 1),
    page_size: String(options.pageSize ?? TRADE_PAGE_SIZE),
  });

  return apiRequest<RegionTradePage>(
    `/api/v1/properties/trades?${query.toString()}`,
    { signal },
  );
}
