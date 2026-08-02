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
  it("희망 주택 입력을 접지 않고 처음부터 보여준다", async () => {
    await renderStep();

    // 접어 두면 이 필드들에 검증 오류가 났을 때 [다음]이 반응하지 않는 이유가
    // 화면 어디에도 보이지 않는다. 그래서 토글 자체를 없앴다.
    expect(screen.getByLabelText("지역")).toBeInTheDocument();
    expect(screen.getByLabelText("목표 가격 (원)")).toBeInTheDocument();
    expect(screen.getByLabelText("전용면적 (㎡)")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "희망 주택" }),
    ).not.toBeInTheDocument();
  });

  it("지도를 그리지 않는다", async () => {
    await renderStep();

    expect(
      screen.queryByRole("region", { name: "대한민국 지도" }),
    ).not.toBeInTheDocument();
    expect(loadKakaoMaps).not.toHaveBeenCalled();
  });

  it("목표 시점 입력은 그대로다", async () => {
    await renderStep();

    expect(screen.getByLabelText("목표 시점 (YYYY-MM)")).toHaveValue("2028-07");
  });
});
