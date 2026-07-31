import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { KakaoMapsNamespace } from "@/lib/map/kakao-types";

import { KakaoMap } from "./kakao-map";

const { loadKakaoMaps } = vi.hoisted(() => ({ loadKakaoMaps: vi.fn() }));

vi.mock("@/lib/map/kakao-loader", () => ({ loadKakaoMaps }));

/** 생성자 호출을 기록하는 SDK 대역. */
function fakeMaps() {
  const LatLng = vi.fn();
  const MapCtor = vi.fn();
  const maps = {
    LatLng,
    Map: MapCtor,
    load: (callback: () => void) => callback(),
  } as unknown as KakaoMapsNamespace;
  return { maps, LatLng, MapCtor };
}

beforeEach(() => {
  loadKakaoMaps.mockReset();
  vi.stubEnv("NEXT_PUBLIC_KAKAO_MAP_APP_KEY", "TEST_KEY");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("KakaoMap", () => {
  it("앱 키가 없으면 안내 문구를 보여주고 SDK를 부르지 않는다", () => {
    vi.stubEnv("NEXT_PUBLIC_KAKAO_MAP_APP_KEY", "");

    render(<KakaoMap />);

    expect(
      screen.getByText(/NEXT_PUBLIC_KAKAO_MAP_APP_KEY/),
    ).toBeInTheDocument();
    expect(loadKakaoMaps).not.toHaveBeenCalled();
  });

  it("전국이 보이는 기본 뷰로 지도를 만든다", async () => {
    const { maps, LatLng, MapCtor } = fakeMaps();
    loadKakaoMaps.mockResolvedValue(maps);

    render(<KakaoMap />);

    await waitFor(() => expect(MapCtor).toHaveBeenCalledTimes(1));
    expect(loadKakaoMaps).toHaveBeenCalledWith("TEST_KEY");
    expect(LatLng).toHaveBeenCalledWith(36.5, 127.9);
    expect(MapCtor.mock.calls[0][1]).toMatchObject({ level: 13 });
  });

  it("지도를 만들면 로딩 문구를 지운다", async () => {
    const { maps } = fakeMaps();
    loadKakaoMaps.mockResolvedValue(maps);

    render(<KakaoMap />);

    expect(screen.getByText("지도를 불러오는 중…")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText("지도를 불러오는 중…")).not.toBeInTheDocument(),
    );
  });

  it("center와 level을 넘기면 그 값으로 지도를 만든다", async () => {
    const { maps, LatLng, MapCtor } = fakeMaps();
    loadKakaoMaps.mockResolvedValue(maps);

    render(<KakaoMap center={{ lat: 37.5665, lng: 126.978 }} level={8} />);

    await waitFor(() => expect(MapCtor).toHaveBeenCalledTimes(1));
    expect(LatLng).toHaveBeenCalledWith(37.5665, 126.978);
    expect(MapCtor.mock.calls[0][1]).toMatchObject({ level: 8 });
  });

  it("SDK 로드에 실패하면 오류 문구를 보여준다", async () => {
    loadKakaoMaps.mockRejectedValue(new Error("boom"));

    render(<KakaoMap />);

    expect(
      await screen.findByText(/지도를 불러오지 못했습니다/),
    ).toBeInTheDocument();
  });

  it("지도 영역에 접근 가능한 이름을 붙인다", () => {
    loadKakaoMaps.mockReturnValue(new Promise(() => {}));

    render(<KakaoMap />);

    expect(
      screen.getByRole("region", { name: "대한민국 지도" }),
    ).toBeInTheDocument();
  });
});
