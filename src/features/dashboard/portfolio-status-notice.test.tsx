import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { loadResult } from "@/lib/fixtures/loader";

import { PortfolioStatusNotice } from "./portfolio-status-notice";

const INFEASIBLE = "persona_m_college_student_09_affluent";

describe("PortfolioStatusNotice", () => {
  it("배분에 실패해도 기준일 배지를 보여준다", async () => {
    const result = await loadResult(INFEASIBLE);
    render(<PortfolioStatusNotice result={result} />);

    expect(
      screen.getByText(`기준일 ${result.source.as_of.replaceAll("-", ".")}`),
    ).toBeInTheDocument();
  });

  it("validation_reasons도 함께 보여준다", async () => {
    const result = await loadResult(INFEASIBLE);
    render(<PortfolioStatusNotice result={result} />);

    for (const reason of result.validation_reasons) {
      expect(screen.getByText(reason)).toBeInTheDocument();
    }
  });
});
