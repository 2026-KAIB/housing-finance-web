import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { loadMydata } from "@/lib/fixtures/loader";

import { MonthlyFlowChart, toChartRows } from "./monthly-flow-chart";

const SAMPLE = "persona_e_college_student_basic";

describe("toChartRows", () => {
  it("월 라벨을 짧은 형식으로 바꾼다", () => {
    expect(
      toChartRows([
        { ym: "202607", income: 800000, expense: 700000, interest: 3360, net: 100000 },
      ]),
    ).toEqual([
      { label: "26.07", income: 800000, expense: 700000, net: 100000 },
    ]);
  });

  it("소득이 없는 달도 0으로 남긴다", () => {
    const rows = toChartRows([
      { ym: "202508", income: 0, expense: 700000, interest: 0, net: -700000 },
    ]);

    expect(rows[0].income).toBe(0);
    expect(rows).toHaveLength(1);
  });
});

describe("MonthlyFlowChart", () => {
  it("월별 표를 함께 보여준다", async () => {
    const mydata = await loadMydata(SAMPLE);
    render(<MonthlyFlowChart rows={mydata.monthly_summary} />);

    expect(
      screen.getByRole("table", { name: "월별 입출금 합계" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(
      mydata.monthly_summary.length + 1,
    );
  });

  it("집계 출처를 밝힌다", async () => {
    const mydata = await loadMydata(SAMPLE);
    render(<MonthlyFlowChart rows={mydata.monthly_summary} />);

    expect(
      screen.getByText(/거래내역 단순 합계입니다/),
    ).toBeInTheDocument();
  });
});
