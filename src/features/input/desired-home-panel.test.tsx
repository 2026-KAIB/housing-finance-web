import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PersonaProfile } from "@/lib/contracts/persona";
import { loadProfile } from "@/lib/fixtures/loader";

import { DesiredHomePanel } from "./desired-home-panel";
import { type InputFormValues, toFormValues } from "./form-schema";

const { loadKakaoMaps } = vi.hoisted(() => ({ loadKakaoMaps: vi.fn() }));
const { fetchRegionTrades } = vi.hoisted(() => ({ fetchRegionTrades: vi.fn() }));

vi.mock("@/lib/map/kakao-loader", () => ({ loadKakaoMaps }));

// 패널이 실거래를 조회하므로, 목이 없으면 테스트가 실제 네트워크로 나간다.
vi.mock("@/lib/api/region-trades", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/region-trades")>()),
  fetchRegionTrades,
}));

const SAMPLE = "persona_e_college_student_basic";

// persona_e는 11650(서초구)로 프리필된다.
const TRADE_PAGE = {
  schema_version: "1.0.0" as const,
  sgg_code: "11650",
  sgg_name: "서초구",
  sort: "area_asc" as const,
  page: 1,
  page_size: 5,
  total_count: 1,
  total_pages: 1,
  trades: [
    {
      trade_id: 7,
      apt_name: "반포자이",
      umd_name: "반포동",
      road_name: "신반포로",
      build_year: 2008,
      exclusive_area_m2: "84.9400",
      floor: 11,
      contract_date: "2026-05-02",
      deal_amount_won: 1_800_000_000,
    },
  ],
};

function Harness({ profile }: { profile: PersonaProfile }) {
  const form = useForm<InputFormValues>({
    defaultValues: toFormValues(profile),
  });

  return (
    <FormProvider {...form}>
      <DesiredHomePanel />
    </FormProvider>
  );
}

async function renderPanel() {
  const profile = await loadProfile(SAMPLE);
  render(<Harness profile={profile} />);
  return profile;
}

beforeEach(() => {
  fetchRegionTrades.mockReset();
  fetchRegionTrades.mockResolvedValue(TRADE_PAGE);
  loadKakaoMaps.mockClear();
  // 영원히 pending인 Promise를 주면 지도는 로딩 상태로 멈춘다.
  // 비동기 상태 전이 없이 패널 구조만 검증하기 위한 선택이다.
  loadKakaoMaps.mockReturnValue(new Promise(() => {}));
  vi.stubEnv("NEXT_PUBLIC_KAKAO_MAP_APP_KEY", "TEST_KEY");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("DesiredHomePanel 지역", () => {
  it("자리표시·전체·25개 구로 옵션을 구성한다", async () => {
    await renderPanel();

    const options = Array.from(
      screen.getByLabelText("지역").querySelectorAll("option"),
    );

    expect(options).toHaveLength(27);
    expect(options[0]).toHaveTextContent("지역을 선택하세요");
    expect(options[0]).toBeDisabled();
    expect(options[0]).toHaveValue("");
    expect(options[1]).toHaveTextContent("전체 (서울 25개 구)");
    expect(options[1]).toHaveValue("ALL");
    expect(options[2]).toHaveTextContent("종로구");
    expect(options[2]).toHaveValue("11110");
    expect(options[26]).toHaveTextContent("강동구");
    expect(options[26]).toHaveValue("11740");
  });

  it("프로필의 지역이 선택된 채로 시작한다", async () => {
    await renderPanel();

    // persona_e는 11650(서초구)이다.
    expect(screen.getByLabelText("지역")).toHaveValue("11650");
  });

  it("다른 구를 고를 수 있다", async () => {
    const user = userEvent.setup();
    await renderPanel();

    await user.selectOptions(screen.getByLabelText("지역"), "11680");

    expect(screen.getByLabelText("지역")).toHaveValue("11680");
  });
});

describe("DesiredHomePanel 목표 가격", () => {
  it("프로필의 목표 금액이 채워진 채로 시작한다", async () => {
    const profile = await renderPanel();

    expect(screen.getByLabelText("목표 가격 (원)")).toHaveValue(
      profile.goal.target_price,
    );
  });

  it("값을 고칠 수 있다", async () => {
    const user = userEvent.setup();
    await renderPanel();

    const input = screen.getByLabelText("목표 가격 (원)");
    await user.clear(input);
    await user.type(input, "9000000");

    expect(input).toHaveValue(9000000);
  });
});

describe("DesiredHomePanel 배치", () => {
  it("세 입력을 모두 그린다", async () => {
    await renderPanel();

    expect(screen.getByLabelText("지역")).toBeInTheDocument();
    expect(screen.getByLabelText("목표 가격 (원)")).toBeInTheDocument();
    expect(screen.getByLabelText("전용면적 (㎡)")).toBeInTheDocument();
  });

  it("지도를 그리지 않는다", async () => {
    await renderPanel();

    expect(
      screen.queryByRole("region", { name: "대한민국 지도" }),
    ).not.toBeInTheDocument();
    expect(loadKakaoMaps).not.toHaveBeenCalled();
  });
});

describe("DesiredHomePanel 실거래", () => {
  it("선택된 지역의 실거래를 조회한다", async () => {
    await renderPanel();

    await waitFor(() =>
      expect(fetchRegionTrades).toHaveBeenCalledWith(
        "11650",
        { sort: "area_asc", page: 1 },
        expect.anything(),
      ),
    );
  });

  it("거래 행을 누르면 목표 가격이 채워진다", async () => {
    const user = userEvent.setup();
    await renderPanel();

    await user.click(await screen.findByRole("button", { name: /반포자이/ }));

    expect(screen.getByLabelText("목표 가격 (원)")).toHaveValue(1_800_000_000);
  });

  it("실거래 목록을 그린다", async () => {
    await renderPanel();

    expect(
      await screen.findByRole("region", { name: "실거래 목록" }),
    ).toBeInTheDocument();
  });
});
