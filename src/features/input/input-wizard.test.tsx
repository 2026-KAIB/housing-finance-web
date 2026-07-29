import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { loadMydata, loadProfile } from "@/lib/fixtures/loader";

import { InputWizard } from "./input-wizard";

const SAMPLE = "persona_e_college_student_basic";

async function renderWizard() {
  const [profile, mydata] = await Promise.all([
    loadProfile(SAMPLE),
    loadMydata(SAMPLE),
  ]);

  render(<InputWizard personaId={SAMPLE} profile={profile} mydata={mydata} />);
  return { profile, mydata };
}

describe("InputWizard", () => {
  it("step 1에서 프로필 값이 프리필된다", async () => {
    await renderWizard();

    expect(screen.getByLabelText("나이")).toHaveValue(25);
    expect(screen.getByLabelText("월 소득 (원)")).toHaveValue(800000);
    expect(screen.getByLabelText("월 평균 지출 (원)")).toHaveValue(700000);
  });

  it("코드값을 한글 라벨로 보여준다", async () => {
    await renderWizard();

    expect(screen.getByText("대학 재학")).toBeInTheDocument();
    expect(screen.getByText("아르바이트")).toBeInTheDocument();
  });

  it("다음 버튼으로 step 2로 이동한다", async () => {
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

  it("step 1에서는 이전 버튼이 없다", async () => {
    await renderWizard();
    expect(screen.queryByRole("button", { name: "이전" })).not.toBeInTheDocument();
  });
});
