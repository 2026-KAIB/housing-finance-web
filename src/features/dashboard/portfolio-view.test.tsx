import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { loadResult } from "@/lib/fixtures/loader";

import { PortfolioView } from "./portfolio-view";

const COMPLETE = "persona_e_college_student_basic";
const INFEASIBLE = "persona_m_college_student_09_affluent";
const NO_ALLOCATION = "persona_u_college_student_17_poor";

describe("PortfolioView — COMPLETE", () => {
  it("배분된 상품명과 점수를 보여준다", async () => {
    const result = await loadResult(COMPLETE);
    render(<PortfolioView result={result} edited={false} />);

    expect(screen.getByText(result.allocations[0].product_name)).toBeInTheDocument();
    expect(screen.getByText("85.54")).toBeInTheDocument();
  });

  it("긴 소수 금액을 포맷해서 보여준다", async () => {
    render(<PortfolioView result={await loadResult(COMPLETE)} edited={false} />);

    expect(screen.getByText("277만 4,194원")).toBeInTheDocument();
    expect(screen.queryByText(/2774194\.2/)).not.toBeInTheDocument();
  });

  it("정책 통과 배지를 보여준다", async () => {
    render(<PortfolioView result={await loadResult(COMPLETE)} edited={false} />);
    expect(screen.getByText("정책 통과")).toBeInTheDocument();
  });
});

describe("PortfolioView — INFEASIBLE", () => {
  it("배분 사유를 그대로 보여준다", async () => {
    render(<PortfolioView result={await loadResult(INFEASIBLE)} edited={false} />);

    expect(
      screen.getByText(/예금자보호 제약을 만족하는 조합이 없습니다/),
    ).toBeInTheDocument();
  });

  it("정책 상태가 UNKNOWN이므로 통과 배지를 보여주지 않는다", async () => {
    render(<PortfolioView result={await loadResult(INFEASIBLE)} edited={false} />);
    expect(screen.queryByText("정책 통과")).not.toBeInTheDocument();
  });

  it("배분표를 그리지 않는다", async () => {
    render(<PortfolioView result={await loadResult(INFEASIBLE)} edited={false} />);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("PortfolioView — NO_ALLOCATION_REQUIRED", () => {
  it("추가 저축이 필요 없다는 사유를 보여준다", async () => {
    render(
      <PortfolioView result={await loadResult(NO_ALLOCATION)} edited={false} />,
    );

    expect(
      screen.getByText(/월 적립액과 일시예치금이 모두 0원입니다/),
    ).toBeInTheDocument();
  });
});

describe("PortfolioView — 편집 안내", () => {
  it("edited면 안내 문구를 띄운다", async () => {
    render(<PortfolioView result={await loadResult(COMPLETE)} edited />);

    expect(
      screen.getByText(/현재 결과는 페르소나 기준값 기준입니다/),
    ).toBeInTheDocument();
  });

  it("edited가 아니면 안내가 없다", async () => {
    render(<PortfolioView result={await loadResult(COMPLETE)} edited={false} />);

    expect(
      screen.queryByText(/현재 결과는 페르소나 기준값 기준입니다/),
    ).not.toBeInTheDocument();
  });
});
