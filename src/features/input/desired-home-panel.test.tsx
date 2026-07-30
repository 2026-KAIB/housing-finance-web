import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DesiredHomePanel } from "./desired-home-panel";

const { loadKakaoMaps } = vi.hoisted(() => ({ loadKakaoMaps: vi.fn() }));

vi.mock("@/lib/map/kakao-loader", () => ({ loadKakaoMaps }));

beforeEach(() => {
  loadKakaoMaps.mockClear();
  // 영원히 pending인 Promise를 주면 지도는 로딩 상태로 멈춘다.
  // 비동기 상태 전이 없이 패널 구조만 검증하기 위한 선택이다.
  loadKakaoMaps.mockReturnValue(new Promise(() => {}));
  vi.stubEnv("NEXT_PUBLIC_KAKAO_MAP_APP_KEY", "TEST_KEY");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("DesiredHomePanel", () => {
  it("지역과 목표 가격 토글을 둔다", () => {
    render(<DesiredHomePanel id="desired-home-panel" />);

    expect(screen.getByRole("button", { name: "지역" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "목표 가격" }),
    ).toBeInTheDocument();
  });

  it("기본값은 지역이 선택된 상태다", () => {
    render(<DesiredHomePanel id="desired-home-panel" />);

    expect(screen.getByRole("button", { name: "지역" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "목표 가격" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("목표 가격을 누르면 선택이 옮겨간다", async () => {
    const user = userEvent.setup();
    render(<DesiredHomePanel id="desired-home-panel" />);

    await user.click(screen.getByRole("button", { name: "목표 가격" }));

    expect(screen.getByRole("button", { name: "목표 가격" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "지역" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("토글을 바꿔도 지도를 다시 만들지 않는다", async () => {
    const user = userEvent.setup();
    render(<DesiredHomePanel id="desired-home-panel" />);

    expect(loadKakaoMaps).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "목표 가격" }));

    expect(
      screen.getByRole("region", { name: "대한민국 지도" }),
    ).toBeInTheDocument();
    expect(loadKakaoMaps).toHaveBeenCalledTimes(1);
  });

  it("전달받은 id를 패널 컨테이너에 붙인다", () => {
    const { container } = render(<DesiredHomePanel id="desired-home-panel" />);

    expect(container.querySelector("#desired-home-panel")).not.toBeNull();
  });
});
