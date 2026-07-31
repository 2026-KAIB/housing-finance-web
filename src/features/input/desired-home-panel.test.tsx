import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PersonaProfile } from "@/lib/contracts/persona";
import { loadProfile } from "@/lib/fixtures/loader";

import { DesiredHomePanel } from "./desired-home-panel";
import { type InputFormValues, toFormValues } from "./form-schema";

const { loadKakaoMaps } = vi.hoisted(() => ({ loadKakaoMaps: vi.fn() }));

vi.mock("@/lib/map/kakao-loader", () => ({ loadKakaoMaps }));

const SAMPLE = "persona_e_college_student_basic";

function Harness({ profile }: { profile: PersonaProfile }) {
  const form = useForm<InputFormValues>({
    defaultValues: toFormValues(profile),
  });

  return (
    <FormProvider {...form}>
      <DesiredHomePanel id="desired-home-panel" />
    </FormProvider>
  );
}

async function renderPanel() {
  const profile = await loadProfile(SAMPLE);
  render(<Harness profile={profile} />);
  return profile;
}

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
  it("두 필드를 지도 바깥에 둔다", async () => {
    await renderPanel();

    const map = screen.getByRole("region", { name: "대한민국 지도" });

    expect(map.contains(screen.getByLabelText("지역"))).toBe(false);
    expect(map.contains(screen.getByLabelText("목표 가격 (원)"))).toBe(false);
  });

  it("지역을 바꿔도 지도를 다시 만들지 않는다", async () => {
    const user = userEvent.setup();
    await renderPanel();

    expect(loadKakaoMaps).toHaveBeenCalledTimes(1);
    await user.selectOptions(screen.getByLabelText("지역"), "11680");

    expect(
      screen.getByRole("region", { name: "대한민국 지도" }),
    ).toBeInTheDocument();
    expect(loadKakaoMaps).toHaveBeenCalledTimes(1);
  });

  it("전달받은 id를 패널 컨테이너에 붙인다", async () => {
    const profile = await loadProfile(SAMPLE);
    const { container } = render(<Harness profile={profile} />);

    expect(container.querySelector("#desired-home-panel")).not.toBeNull();
  });
});
