import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FormProvider, useForm } from "react-hook-form";

import type { PersonaProfile } from "@/lib/contracts/persona";
import { loadPersonaIndex, loadProfile } from "@/lib/fixtures/loader";

import { type InputFormValues, toFormValues } from "./form-schema";
import { StepInput } from "./step-input";

const { loadKakaoMaps } = vi.hoisted(() => ({ loadKakaoMaps: vi.fn() }));

vi.mock("@/lib/map/kakao-loader", () => ({ loadKakaoMaps }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

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

  it("버튼을 누르면 토글과 지도가 나타난다", async () => {
    const user = userEvent.setup();
    await renderStep();

    await user.click(screen.getByRole("button", { name: "희망 주택" }));

    expect(screen.getByRole("button", { name: "지역" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "목표 가격" }),
    ).toBeInTheDocument();
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

  it("패널을 열어도 목표 금액 입력은 그대로다", async () => {
    const user = userEvent.setup();
    await renderStep();

    await user.click(screen.getByRole("button", { name: "희망 주택" }));

    expect(screen.getByLabelText("목표 금액 (원)")).toHaveValue(5000000);
  });
});
