import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import type { Mydata } from "@/lib/contracts/persona";
import { loadMydata } from "@/lib/fixtures/loader";
import { formatWon } from "@/lib/format/money";

import { MydataPanel } from "./mydata-panel";

// 불러온 상태는 호출자(입력 위저드)가 쥔다. 그 역할을 대신하는 최소 껍데기.
function Harness({
  personaId,
  mydata,
}: {
  personaId: string;
  mydata: Mydata;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <MydataPanel
      personaId={personaId}
      mydata={mydata}
      loaded={loaded}
      onLoad={() => setLoaded(true)}
    />
  );
}

const WITH_LOAN = "persona_s_college_student_15_poor";
const NO_LOAN = "persona_e_college_student_basic";

describe("MydataPanel", () => {
  it("불러오기 전에는 목록을 보여주지 않는다", async () => {
    render(<Harness personaId={NO_LOAN} mydata={await loadMydata(NO_LOAN)} />);

    expect(
      screen.getByRole("button", { name: "마이데이터 불러오기" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /계좌/ })).not.toBeInTheDocument();
  });

  it("불러오기를 누르면 탭이 나타난다", async () => {
    const user = userEvent.setup();
    render(<Harness personaId={NO_LOAN} mydata={await loadMydata(NO_LOAN)} />);

    await user.click(screen.getByRole("button", { name: "마이데이터 불러오기" }));

    expect(screen.getByRole("tab", { name: /계좌/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /예적금/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /대출/ })).toBeInTheDocument();
  });

  it("계좌 탭에 마스킹된 계좌번호와 잔액을 보여준다", async () => {
    const user = userEvent.setup();
    const mydata = await loadMydata(NO_LOAN);
    render(<Harness personaId={NO_LOAN} mydata={mydata} />);

    await user.click(screen.getByRole("button", { name: "마이데이터 불러오기" }));

    const account = mydata.accounts[0];
    expect(screen.getByText(account.account_num_masked)).toBeInTheDocument();
    expect(screen.getByText(account.prod_name)).toBeInTheDocument();
    expect(screen.getByText("연 0.1%")).toBeInTheDocument();
    expect(screen.getByText(formatWon(account.balance_amt))).toBeInTheDocument();
  });

  it("대출이 없으면 빈 상태를 안내한다", async () => {
    const user = userEvent.setup();
    render(<Harness personaId={NO_LOAN} mydata={await loadMydata(NO_LOAN)} />);

    await user.click(screen.getByRole("button", { name: "마이데이터 불러오기" }));
    await user.click(screen.getByRole("tab", { name: /대출/ }));

    expect(screen.getByText("보유한 대출이 없습니다.")).toBeInTheDocument();
  });

  it("대출이 있으면 상환방식 라벨을 보여준다", async () => {
    const user = userEvent.setup();
    const mydata = await loadMydata(WITH_LOAN);
    render(<Harness personaId={WITH_LOAN} mydata={mydata} />);

    await user.click(screen.getByRole("button", { name: "마이데이터 불러오기" }));
    await user.click(screen.getByRole("tab", { name: /대출/ }));

    expect(screen.getByText("원리금균등분할상환")).toBeInTheDocument();
    expect(screen.getByText("한국장학재단 일반상환 학자금대출")).toBeInTheDocument();

    const loan = mydata.loans[0];
    expect(screen.getByText(formatWon(loan.balance_amt))).toBeInTheDocument();
  });

  it("기준일 배지를 보여준다", async () => {
    const user = userEvent.setup();
    render(<Harness personaId={NO_LOAN} mydata={await loadMydata(NO_LOAN)} />);

    await user.click(screen.getByRole("button", { name: "마이데이터 불러오기" }));
    expect(screen.getByText("기준일 2026.07.24")).toBeInTheDocument();
  });
});
