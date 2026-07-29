import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { loadMydata } from "@/lib/fixtures/loader";

import { TransactionPanel } from "./transaction-panel";

const SAMPLE = "persona_e_college_student_basic";

const payload = {
  persona_id: SAMPLE,
  accounts: {
    "4010-**-**0001": {
      trans_list: [
        {
          trans_dtime: "20260723194656",
          trans_no: "00000304",
          trans_type: "02",
          trans_type_label: "출금",
          trans_class: "체크카드",
          trans_amt: 25500,
          balance_amt: 1000000,
          trans_memo: "서점",
        },
      ],
    },
  },
  source: { generator: "generate_all.py", as_of: "2026-07-24" },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TransactionPanel", () => {
  it("탭이 열릴 때 한 번만 가져온다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
    vi.stubGlobal("fetch", fetchMock);

    const mydata = await loadMydata(SAMPLE);
    const { rerender } = render(
      <TransactionPanel personaId={SAMPLE} accounts={mydata.accounts} />,
    );

    await waitFor(() => expect(screen.getByText("서점")).toBeInTheDocument());

    rerender(<TransactionPanel personaId={SAMPLE} accounts={mydata.accounts} />);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `/fixtures/${SAMPLE}/transactions.json`,
    );
  });

  it("거래 구분 라벨과 금액을 보여준다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => payload }),
    );

    const mydata = await loadMydata(SAMPLE);
    render(<TransactionPanel personaId={SAMPLE} accounts={mydata.accounts} />);

    await waitFor(() => expect(screen.getByText("출금")).toBeInTheDocument());
    expect(screen.getByText("25,500원")).toBeInTheDocument();
    expect(screen.getByText("체크카드")).toBeInTheDocument();
  });

  it("계약을 어긴 응답은 오류로 알린다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ persona_id: SAMPLE }),
      }),
    );

    const mydata = await loadMydata(SAMPLE);
    render(<TransactionPanel personaId={SAMPLE} accounts={mydata.accounts} />);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "거래내역을 불러오지 못했습니다",
      ),
    );
  });

  it("거래내역이 없는 계좌만 있으면 안내한다", async () => {
    vi.stubGlobal("fetch", vi.fn());

    render(<TransactionPanel personaId={SAMPLE} accounts={[]} />);

    expect(
      screen.getByText("거래내역이 있는 계좌가 없습니다."),
    ).toBeInTheDocument();
  });
});
