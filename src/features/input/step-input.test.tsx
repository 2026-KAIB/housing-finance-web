import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FormProvider, useForm } from "react-hook-form";

import type { PersonaProfile } from "@/lib/contracts/persona";
import { loadPersonaIndex, loadProfile } from "@/lib/fixtures/loader";

import { type InputFormValues, toFormValues } from "./form-schema";
import { StepInput } from "./step-input";

const { loadKakaoMaps } = vi.hoisted(() => ({ loadKakaoMaps: vi.fn() }));
const { fetchRegionTrades } = vi.hoisted(() => ({ fetchRegionTrades: vi.fn() }));

vi.mock("@/lib/map/kakao-loader", () => ({ loadKakaoMaps }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

// 희망 주택 패널은 프리필된 지역의 실거래를 조회한다. 목이 없으면 테스트가
// http://localhost:8000 으로 실제 요청을 보내고, 그 포트에 개발 서버가 떠
// 있는지에 따라 결과가 달라진다.
vi.mock("@/lib/api/region-trades", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/region-trades")>()),
  fetchRegionTrades,
}));

const SAMPLE = "persona_e_college_student_basic";

/** StepInput의 하위 필드들이 useFormContext를 쓰므로 FormProvider가 필요하다. */
function Harness({ profile }: { profile: PersonaProfile }) {
  const form = useForm<InputFormValues>({
    defaultValues: toFormValues(profile),
  });

  return (
    <FormProvider {...form}>
      <StepInput
        personaId={SAMPLE}
        personas={loadPersonaIndex().personas}
        profile={profile}
      />
    </FormProvider>
  );
}

async function renderStep() {
  const profile = await loadProfile(SAMPLE);
  render(<Harness profile={profile} />);
}

beforeEach(() => {
  loadKakaoMaps.mockReturnValue(new Promise(() => {}));
  // 영원히 pending이면 실거래 목록은 로딩 상태로 멈춘다. 이 파일은 패널의 구조만
  // 보므로 응답 내용이 필요 없다.
  fetchRegionTrades.mockReturnValue(new Promise(() => {}));
  vi.stubEnv("NEXT_PUBLIC_KAKAO_MAP_APP_KEY", "TEST_KEY");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("StepInput 희망 주택", () => {
  it("목표 설정 옆에 희망 주택 버튼을 둔다", async () => {
    await renderStep();

    const button = screen.getByRole("button", { name: "희망 주택" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("aria-controls", "desired-home-panel");
  });

  it("처음에는 지도 패널이 닫혀 있다", async () => {
    await renderStep();

    expect(
      screen.queryByRole("region", { name: "대한민국 지도" }),
    ).not.toBeInTheDocument();
  });

  it("버튼을 누르면 지역·목표 가격 필드와 지도가 나타난다", async () => {
    const user = userEvent.setup();
    await renderStep();

    await user.click(screen.getByRole("button", { name: "희망 주택" }));

    // 지역·목표 가격은 Task 3에서 토글 버튼(role=button)이 아닌 폼 필드로
    // 바뀌었다. 라벨로 찾는다.
    expect(screen.getByLabelText("지역")).toBeInTheDocument();
    expect(screen.getByLabelText("목표 가격 (원)")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "대한민국 지도" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "희망 주택" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("버튼을 다시 누르면 패널이 닫힌다", async () => {
    const user = userEvent.setup();
    await renderStep();

    const button = screen.getByRole("button", { name: "희망 주택" });
    await user.click(button);
    await user.click(button);

    expect(
      screen.queryByRole("region", { name: "대한민국 지도" }),
    ).not.toBeInTheDocument();
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("패널을 열어도 목표 시점 입력은 그대로다", async () => {
    const user = userEvent.setup();
    await renderStep();

    await user.click(screen.getByRole("button", { name: "희망 주택" }));

    expect(screen.getByLabelText("목표 시점 (YYYY-MM)")).toHaveValue("2028-07");
  });
});
