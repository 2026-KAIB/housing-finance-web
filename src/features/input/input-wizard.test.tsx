import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  loadMydata,
  loadPersonaIndex,
  loadProfile,
} from "@/lib/fixtures/loader";
import { formatWon } from "@/lib/format/money";

import { InputWizard } from "./input-wizard";

const { push, loadKakaoMaps, fetchRegionTrades } = vi.hoisted(() => ({
  push: vi.fn(),
  loadKakaoMaps: vi.fn(),
  fetchRegionTrades: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  redirect: vi.fn(),
}));

vi.mock("@/lib/map/kakao-loader", () => ({ loadKakaoMaps }));

// 희망 주택 패널은 프리필된 지역의 실거래를 조회한다. 목이 없으면 테스트가
// http://localhost:8000 으로 실제 요청을 보내고, 그 포트에 개발 서버가 떠
// 있는지에 따라 결과가 달라진다.
vi.mock("@/lib/api/region-trades", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/region-trades")>()),
  fetchRegionTrades,
}));

const SAMPLE = "persona_e_college_student_basic";

async function renderWizard() {
  const [profile, mydata] = await Promise.all([
    loadProfile(SAMPLE),
    loadMydata(SAMPLE),
  ]);

  render(
    <InputWizard
      personaId={SAMPLE}
      personas={loadPersonaIndex().personas}
      profile={profile}
      mydata={mydata}
    />,
  );
  return { profile, mydata };
}

/**
 * FieldRow는 힌트와 에러를 같은 자리에 배타적으로 그린다(<p> 하나).
 * 라벨로 입력을 찾고 그 행 안의 <p>를 읽어, 다른 행의 같은 문자열과 섞이지
 * 않게 한다 — "70만원"은 월 평균 지출과 비상 예비금 양쪽에 나타난다.
 */
function hintFor(label: string): string | null {
  const row = screen.getByLabelText(label).parentElement;
  return row?.querySelector("p")?.textContent ?? null;
}

/** step 1 → step 2 → step 3. 단계마다 [다음] 한 번. */
async function goToReview(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "다음" }));
  await user.click(screen.getByRole("button", { name: "다음" }));
}

describe("InputWizard", () => {
  beforeEach(() => {
    push.mockClear();
    loadKakaoMaps.mockClear();
    loadKakaoMaps.mockReturnValue(new Promise(() => {}));
    // 영원히 pending이면 실거래 목록은 로딩 상태로 멈춘다. 이 파일은 폼 동작을
    // 보므로 응답 내용이 필요 없다.
    fetchRegionTrades.mockReset();
    fetchRegionTrades.mockReturnValue(new Promise(() => {}));
    vi.stubEnv("NEXT_PUBLIC_KAKAO_MAP_APP_KEY", "TEST_KEY");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("step 1에 기본정보·목표설정·저축계획이 함께 프리필된다", async () => {
    await renderWizard();

    expect(screen.getByLabelText("나이")).toHaveValue(25);
    expect(screen.getByLabelText("월 소득 (원)")).toHaveValue(800000);
    expect(screen.getByLabelText("월 평균 지출 (원)")).toHaveValue(700000);
    expect(screen.getByLabelText("월 저축 예산 (원)")).toHaveValue(100000);
  });

  it("목표 시점을 YYYY-MM으로 프리필한다", async () => {
    await renderWizard();

    expect(screen.getByLabelText("목표 시점 (YYYY-MM)")).toHaveValue("2028-07");
  });

  it("위험 성향이 프로필 값으로 선택되어 있다", async () => {
    await renderWizard();

    expect(screen.getByLabelText("위험 성향")).toHaveValue("stability");
  });

  it("step 1에 페르소나 선택기를 둔다", async () => {
    await renderWizard();

    expect(
      screen.getByLabelText("페르소나 선택 (프로토타입 전용)"),
    ).toHaveValue(SAMPLE);
  });

  it("다음 버튼으로 step 2 마이데이터로 이동한다", async () => {
    const user = userEvent.setup();
    await renderWizard();

    await user.click(screen.getByRole("button", { name: "다음" }));
    expect(
      screen.getByRole("heading", { level: 2, name: /마이데이터/ }),
    ).toBeInTheDocument();
  });

  it("나이를 비우면 다음으로 넘어가지 않는다", async () => {
    const user = userEvent.setup();
    await renderWizard();

    await user.clear(screen.getByLabelText("나이"));
    await user.click(screen.getByRole("button", { name: "다음" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "나이를 입력하세요",
    );
    expect(
      screen.queryByRole("heading", { level: 2, name: /마이데이터/ }),
    ).not.toBeInTheDocument();
  });

  it("월 소득을 비우면 다음으로 넘어가지 않는다", async () => {
    const user = userEvent.setup();
    await renderWizard();

    await user.clear(screen.getByLabelText("월 소득 (원)"));
    await user.click(screen.getByRole("button", { name: "다음" }));

    expect(await screen.findByText("금액을 입력하세요")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 2, name: /마이데이터/ }),
    ).not.toBeInTheDocument();
  });

  it("목표 시점이 YYYY-MM이 아니면 다음으로 넘어가지 않는다", async () => {
    const user = userEvent.setup();
    await renderWizard();

    const moveIn = screen.getByLabelText("목표 시점 (YYYY-MM)");
    await user.clear(moveIn);
    await user.type(moveIn, "202807");
    await user.click(screen.getByRole("button", { name: "다음" }));

    expect(
      await screen.findByText("YYYY-MM 형식으로 입력하세요"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 2, name: /마이데이터/ }),
    ).not.toBeInTheDocument();
  });

  it("금액 힌트가 입력한 값을 따라간다", async () => {
    const user = userEvent.setup();
    await renderWizard();

    // persona_e의 월 소득은 800,000원이다.
    expect(hintFor("월 소득 (원)")).toBe("80만원");

    const income = screen.getByLabelText("월 소득 (원)");
    await user.clear(income);
    await user.type(income, "700000");

    expect(hintFor("월 소득 (원)")).toBe("70만원");
  });

  it("희망 주택의 목표 가격 힌트도 입력을 따라간다", async () => {
    const user = userEvent.setup();
    await renderWizard();

    await user.click(screen.getByRole("button", { name: "희망 주택" }));
    expect(hintFor("목표 가격 (원)")).toBe("500만원");

    const target = screen.getByLabelText("목표 가격 (원)");
    await user.clear(target);
    await user.type(target, "120000000");

    expect(hintFor("목표 가격 (원)")).toBe("1억 2,000만원");
  });

  it("금액을 비우면 힌트를 숨긴다", async () => {
    const user = userEvent.setup();
    await renderWizard();

    await user.clear(screen.getByLabelText("월 소득 (원)"));

    expect(hintFor("월 소득 (원)")).toBeNull();
  });

  it("step 1에서는 이전 버튼이 없다", async () => {
    await renderWizard();
    expect(
      screen.queryByRole("button", { name: "이전" }),
    ).not.toBeInTheDocument();
  });

  it("프리필이 온전하면 다음을 바로 누를 수 있다", async () => {
    await renderWizard();

    expect(screen.getByRole("button", { name: "다음" })).toBeEnabled();
    expect(
      screen.queryByText("희망 주택의 지역과 목표 가격을 입력해주세요."),
    ).not.toBeInTheDocument();
  });

  it("목표 가격을 비우면 다음이 잠기고 사유를 알린다", async () => {
    const user = userEvent.setup();
    await renderWizard();

    await user.click(screen.getByRole("button", { name: "희망 주택" }));
    await user.clear(screen.getByLabelText("목표 가격 (원)"));

    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
    expect(
      screen.getByText("희망 주택의 지역과 목표 가격을 입력해주세요."),
    ).toBeInTheDocument();
  });

  it("목표 가격을 비운 채 패널을 닫아도 잠금과 사유가 남는다", async () => {
    const user = userEvent.setup();
    await renderWizard();

    const openPanel = screen.getByRole("button", { name: "희망 주택" });
    await user.click(openPanel);
    await user.clear(screen.getByLabelText("목표 가격 (원)"));
    await user.click(openPanel);

    // 패널을 접으면 입력은 사라지지만 react-hook-form이 값을 버리지 않으므로
    // 빈 값이 그대로 남는다. 사유 문구가 없으면 원인 모를 막다른 길이 된다.
    expect(
      screen.queryByLabelText("목표 가격 (원)"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
    expect(
      screen.getByText("희망 주택의 지역과 목표 가격을 입력해주세요."),
    ).toBeInTheDocument();
  });

  it("목표 가격을 다시 채우면 다음이 풀린다", async () => {
    const user = userEvent.setup();
    await renderWizard();

    await user.click(screen.getByRole("button", { name: "희망 주택" }));
    const target = screen.getByLabelText("목표 가격 (원)");
    await user.clear(target);
    await user.type(target, "5000000");

    expect(screen.getByRole("button", { name: "다음" })).toBeEnabled();
  });

  it("음수 목표 가격으로 다음을 누르면 패널이 열리며 에러를 보여준다", async () => {
    const user = userEvent.setup();
    await renderWizard();

    const openPanel = screen.getByRole("button", { name: "희망 주택" });
    await user.click(openPanel);
    const target = screen.getByLabelText("목표 가격 (원)");
    await user.clear(target);
    await user.type(target, "-5");
    await user.click(openPanel);

    // 음수는 비어 있지 않으므로 [다음]은 활성이다. 눌러야 비로소 검증이 돈다.
    expect(screen.getByRole("button", { name: "다음" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "다음" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "0 이상이어야 합니다",
    );
    expect(
      screen.queryByRole("heading", { level: 2, name: /마이데이터/ }),
    ).not.toBeInTheDocument();
  });

  it("목표 가격이 0이어도 다음은 열려 있다", async () => {
    const user = userEvent.setup();
    await renderWizard();

    await user.click(screen.getByRole("button", { name: "희망 주택" }));
    const target = screen.getByLabelText("목표 가격 (원)");
    await user.clear(target);
    await user.type(target, "0");

    // 0은 유효한 금액이다(zod는 min(0)). isBlank를 !value로 바꾸면 여기서 깨진다.
    expect(screen.getByRole("button", { name: "다음" })).toBeEnabled();
  });

  it("희망 주택 패널을 열어도 다음 단계로 넘어간다", async () => {
    const user = userEvent.setup();
    await renderWizard();

    await user.click(screen.getByRole("button", { name: "희망 주택" }));
    await user.click(screen.getByRole("button", { name: "다음" }));

    expect(
      screen.getByRole("heading", { level: 2, name: /마이데이터/ }),
    ).toBeInTheDocument();
  });

  it("step 3에서 입력값을 다시 보여준다", async () => {
    const user = userEvent.setup();
    await renderWizard();

    await goToReview(user);

    expect(
      screen.getByRole("heading", { level: 2, name: "입력한 정보" }),
    ).toBeInTheDocument();
    expect(screen.getByText("5,000,000원")).toBeInTheDocument();
    expect(screen.getByText("2028년 7월")).toBeInTheDocument();
  });

  it("마이데이터를 불러오지 않고 step 3에 오면 미연동을 알린다", async () => {
    const user = userEvent.setup();
    await renderWizard();

    await goToReview(user);

    expect(
      screen.getByText(/아직 마이데이터를 불러오지 않았습니다/),
    ).toBeInTheDocument();
  });

  it("step 2에서 불러온 상태가 step 3까지 유지된다", async () => {
    const user = userEvent.setup();
    const { mydata } = await renderWizard();

    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.click(
      screen.getByRole("button", { name: "마이데이터 불러오기" }),
    );
    await user.click(screen.getByRole("button", { name: "다음" }));

    expect(screen.getByText("불러오기 완료")).toBeInTheDocument();
    expect(
      screen.getByText(formatWon(mydata.totals.total_balance)),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/아직 마이데이터를 불러오지 않았습니다/),
    ).not.toBeInTheDocument();
  });

  it("step 3에서 결과 보기를 누르면 대시보드로 이동한다", async () => {
    const user = userEvent.setup();
    await renderWizard();

    await goToReview(user);
    await user.click(screen.getByRole("button", { name: "결과 보기" }));

    expect(push).toHaveBeenCalledWith(`/dashboard?persona=${SAMPLE}`);
  });

  it("값을 바꾸면 edited 표시를 붙여 이동한다", async () => {
    const user = userEvent.setup();
    await renderWizard();

    await user.click(screen.getByRole("button", { name: "희망 주택" }));
    const target = screen.getByLabelText("목표 가격 (원)");
    await user.clear(target);
    await user.type(target, "9000000");

    await goToReview(user);
    await user.click(screen.getByRole("button", { name: "결과 보기" }));

    expect(push).toHaveBeenCalledWith(`/dashboard?persona=${SAMPLE}&edited=1`);
  });
});
