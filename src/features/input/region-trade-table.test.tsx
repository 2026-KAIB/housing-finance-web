import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RegionTrade, RegionTradePage } from "@/lib/api/region-trades";

import { RegionTradeTable, pageWindow } from "./region-trade-table";

const { fetchRegionTrades } = vi.hoisted(() => ({
  fetchRegionTrades: vi.fn(),
}));

vi.mock("@/lib/api/region-trades", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/region-trades")>()),
  fetchRegionTrades,
}));

function trade(overrides: Partial<RegionTrade> = {}): RegionTrade {
  return {
    trade_id: 1,
    apt_name: "개포주공1단지",
    umd_name: "개포동",
    road_name: "언주로",
    build_year: 1982,
    exclusive_area_m2: "34.4400",
    floor: 5,
    contract_date: "2026-03-14",
    deal_amount_won: 2_250_000_000,
    ...overrides,
  };
}

function page(overrides: Partial<RegionTradePage> = {}): RegionTradePage {
  return {
    schema_version: "1.0.0",
    sgg_code: "11680",
    sgg_name: "강남구",
    sort: "area_asc",
    page: 1,
    page_size: 5,
    total_count: 2994,
    total_pages: 599,
    trades: [trade()],
    ...overrides,
  };
}

beforeEach(() => {
  fetchRegionTrades.mockReset();
  fetchRegionTrades.mockResolvedValue(page());
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("pageWindow", () => {
  it("페이지가 적으면 전부 보여준다", () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("첫 페이지에서는 뒤를 줄인다", () => {
    expect(pageWindow(1, 599)).toEqual([1, 2, "…", 599]);
  });

  it("마지막 페이지에서는 앞을 줄인다", () => {
    expect(pageWindow(599, 599)).toEqual([1, "…", 598, 599]);
  });

  it("가운데서는 양쪽을 줄인다", () => {
    expect(pageWindow(300, 599)).toEqual([1, "…", 299, 300, 301, "…", 599]);
  });

  it("결과가 없어도 1페이지는 있다", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
  });
});

describe("RegionTradeTable 조회", () => {
  it("지역이 선택되지 않으면 조회하지 않는다", () => {
    render(<RegionTradeTable sggCode="" onSelectPrice={vi.fn()} />);

    expect(fetchRegionTrades).not.toHaveBeenCalled();
  });

  it("전체를 고르면 조회하지 않고 안내만 보여준다", () => {
    render(<RegionTradeTable sggCode="ALL" onSelectPrice={vi.fn()} />);

    // 75,240건 15,048페이지는 목록으로서 의미가 없다.
    expect(fetchRegionTrades).not.toHaveBeenCalled();
    expect(screen.getByText(/구를 선택하면/)).toBeInTheDocument();
  });

  it("구를 고르면 기본값(면적 오름차순 1페이지)으로 조회한다", async () => {
    render(<RegionTradeTable sggCode="11680" onSelectPrice={vi.fn()} />);

    await waitFor(() =>
      expect(fetchRegionTrades).toHaveBeenCalledWith(
        "11680",
        { sort: "area_asc", page: 1 },
        expect.anything(),
      ),
    );
  });
});

describe("RegionTradeTable 표시", () => {
  it("요청한 여섯 컬럼과 계약일을 보여준다", async () => {
    render(<RegionTradeTable sggCode="11680" onSelectPrice={vi.fn()} />);

    const row = await screen.findByRole("button", { name: /개포주공1단지/ });
    expect(row).toHaveTextContent("개포주공1단지");
    expect(row).toHaveTextContent("개포동");
    expect(row).toHaveTextContent("언주로");
    expect(row).toHaveTextContent("1982년");
    expect(row).toHaveTextContent("34.44㎡");
    expect(row).toHaveTextContent("5층");
    expect(row).toHaveTextContent("2026-03-14");
    expect(row).toHaveTextContent("22억 5,000만원");
  });

  it("총 거래 건수를 보여준다", async () => {
    render(<RegionTradeTable sggCode="11680" onSelectPrice={vi.fn()} />);

    expect(await screen.findByText(/2,994건/)).toBeInTheDocument();
  });

  it("도로명이 없으면 그 자리를 비운다", async () => {
    fetchRegionTrades.mockResolvedValue(
      page({ trades: [trade({ road_name: null })] }),
    );

    render(<RegionTradeTable sggCode="11680" onSelectPrice={vi.fn()} />);

    const row = await screen.findByRole("button", { name: /개포주공1단지/ });
    expect(row).toHaveTextContent("개포동");
    expect(row).not.toHaveTextContent("언주로");
  });

  it("지하 층을 음수가 아니라 지하로 쓴다", async () => {
    fetchRegionTrades.mockResolvedValue(page({ trades: [trade({ floor: -1 })] }));

    render(<RegionTradeTable sggCode="11680" onSelectPrice={vi.fn()} />);

    const row = await screen.findByRole("button", { name: /개포주공1단지/ });
    expect(row).toHaveTextContent("지하 1층");
  });

  it("행을 누르면 그 거래의 금액을 콜백으로 넘긴다", async () => {
    const user = userEvent.setup();
    const onSelectPrice = vi.fn();
    render(<RegionTradeTable sggCode="11680" onSelectPrice={onSelectPrice} />);

    await user.click(await screen.findByRole("button", { name: /개포주공1단지/ }));

    expect(onSelectPrice).toHaveBeenCalledWith(2_250_000_000);
  });
});

describe("RegionTradeTable 정렬", () => {
  it("드롭다운에 네 가지 정렬이 있고 기본은 좁은 면적 순이다", async () => {
    render(<RegionTradeTable sggCode="11680" onSelectPrice={vi.fn()} />);

    const select = await screen.findByLabelText("정렬");
    expect(
      Array.from(select.querySelectorAll("option")).map((o) => o.textContent),
    ).toEqual(["좁은 면적 순", "넓은 면적 순", "가격 낮은 순", "가격 높은 순"]);
    expect(select).toHaveValue("area_asc");
  });

  it("정렬을 바꾸면 그 값으로 다시 조회한다", async () => {
    const user = userEvent.setup();
    render(<RegionTradeTable sggCode="11680" onSelectPrice={vi.fn()} />);

    await user.selectOptions(await screen.findByLabelText("정렬"), "price_desc");

    await waitFor(() =>
      expect(fetchRegionTrades).toHaveBeenLastCalledWith(
        "11680",
        { sort: "price_desc", page: 1 },
        expect.anything(),
      ),
    );
  });

  it("정렬을 바꾸면 1페이지로 돌아간다", async () => {
    const user = userEvent.setup();
    render(<RegionTradeTable sggCode="11680" onSelectPrice={vi.fn()} />);

    await user.click(await screen.findByRole("button", { name: "2페이지" }));
    await waitFor(() =>
      expect(fetchRegionTrades).toHaveBeenLastCalledWith(
        "11680",
        { sort: "area_asc", page: 2 },
        expect.anything(),
      ),
    );

    await user.selectOptions(screen.getByLabelText("정렬"), "price_asc");

    // 599페이지에서 정렬만 바꾸면 사용자가 목록 한가운데에 떨어진다.
    await waitFor(() =>
      expect(fetchRegionTrades).toHaveBeenLastCalledWith(
        "11680",
        { sort: "price_asc", page: 1 },
        expect.anything(),
      ),
    );
  });
});

describe("RegionTradeTable 페이지네이션", () => {
  it("페이지 번호를 누르면 그 페이지를 조회한다", async () => {
    const user = userEvent.setup();
    render(<RegionTradeTable sggCode="11680" onSelectPrice={vi.fn()} />);

    await user.click(await screen.findByRole("button", { name: "2페이지" }));

    await waitFor(() =>
      expect(fetchRegionTrades).toHaveBeenLastCalledWith(
        "11680",
        { sort: "area_asc", page: 2 },
        expect.anything(),
      ),
    );
  });

  it("현재 페이지를 표시한다", async () => {
    render(<RegionTradeTable sggCode="11680" onSelectPrice={vi.fn()} />);

    expect(await screen.findByRole("button", { name: "1페이지" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("한 페이지뿐이면 페이지네이션을 감춘다", async () => {
    fetchRegionTrades.mockResolvedValue(page({ total_count: 3, total_pages: 1 }));

    render(<RegionTradeTable sggCode="11680" onSelectPrice={vi.fn()} />);

    await screen.findByRole("button", { name: /개포주공1단지/ });
    expect(screen.queryByRole("button", { name: "1페이지" })).toBeNull();
  });

  it("지역을 바꾸면 1페이지로 돌아간다", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <RegionTradeTable sggCode="11680" onSelectPrice={vi.fn()} />,
    );

    await user.click(await screen.findByRole("button", { name: "2페이지" }));
    await waitFor(() => expect(fetchRegionTrades).toHaveBeenCalledTimes(2));

    rerender(<RegionTradeTable sggCode="11110" onSelectPrice={vi.fn()} />);

    await waitFor(() =>
      expect(fetchRegionTrades).toHaveBeenLastCalledWith(
        "11110",
        { sort: "area_asc", page: 1 },
        expect.anything(),
      ),
    );
  });
});

describe("RegionTradeTable 실패", () => {
  it("거래가 없으면 없다고 말한다", async () => {
    fetchRegionTrades.mockResolvedValue(
      page({ total_count: 0, total_pages: 1, trades: [] }),
    );

    render(<RegionTradeTable sggCode="11110" onSelectPrice={vi.fn()} />);

    expect(await screen.findByText(/실거래 기록이 없습니다/)).toBeInTheDocument();
  });

  it("조회에 실패해도 직접 입력할 수 있다고 안내한다", async () => {
    fetchRegionTrades.mockRejectedValue(new Error("실패"));

    render(<RegionTradeTable sggCode="11680" onSelectPrice={vi.fn()} />);

    expect(
      await screen.findByText(/직접 입력할 수 있습니다/),
    ).toBeInTheDocument();
  });

  it("지역이 바뀌면 이전 요청을 취소한다", async () => {
    const { rerender } = render(
      <RegionTradeTable sggCode="11680" onSelectPrice={vi.fn()} />,
    );

    rerender(<RegionTradeTable sggCode="11110" onSelectPrice={vi.fn()} />);

    await waitFor(() => expect(fetchRegionTrades).toHaveBeenCalledTimes(2));
    const firstSignal = fetchRegionTrades.mock.calls[0]![2] as AbortSignal;
    // 취소하지 않으면 늦게 온 이전 지역의 응답이 새 지역의 표를 덮어쓴다.
    expect(firstSignal.aborted).toBe(true);
  });
});
