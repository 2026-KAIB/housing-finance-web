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

    // 25개 구 중위값을 다시 중위내면 전체 중위값이 아니므로 아예 조회하지 않는다.
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

    // 숨기면 5줄이어야 할 표가 4줄로 나오는 이유를 화면이 설명할 수 없다.
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
    fetchRegionPrice.mockResolvedValue({
      ...REFERENCE,
      computed_at: null,
      bands: [],
    });

    render(<RegionPriceTable sggCode="11110" onSelectPrice={vi.fn()} />);

    expect(
      await screen.findByText(/시세 통계가 아직 없습니다/),
    ).toBeInTheDocument();
  });

  it("조회에 실패해도 직접 입력할 수 있다고 안내한다", async () => {
    fetchRegionPrice.mockRejectedValue(
      new Error("시세 데이터를 불러올 수 없습니다."),
    );

    render(<RegionPriceTable sggCode="11680" onSelectPrice={vi.fn()} />);

    expect(
      await screen.findByText(/직접 입력할 수 있습니다/),
    ).toBeInTheDocument();
  });

  it("지역이 바뀌면 이전 요청을 취소한다", async () => {
    const { rerender } = render(
      <RegionPriceTable sggCode="11680" onSelectPrice={vi.fn()} />,
    );

    rerender(<RegionPriceTable sggCode="11110" onSelectPrice={vi.fn()} />);

    await waitFor(() => expect(fetchRegionPrice).toHaveBeenCalledTimes(2));
    const firstSignal = fetchRegionPrice.mock.calls[0]![1] as AbortSignal;
    // 취소하지 않으면 늦게 온 이전 지역의 응답이 새 지역의 표를 덮어쓴다.
    expect(firstSignal.aborted).toBe(true);
  });
});
