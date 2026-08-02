import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SimulationInputPayload } from "@/lib/api/simulation-input";

import { ReportViewer } from "./report-viewer";

const INPUT = {} as SimulationInputPayload;
const REPORT_ID = "8f6c1c30-3f9e-4a2b-9d51-1c0b2e7a4d88";

function mockFetch(response: Response | Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(() => response));
}

function pdfResponse() {
  return new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
    status: 200,
    headers: { "X-Report-Id": REPORT_ID, "content-type": "application/pdf" },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("ReportViewer", () => {
  it("만드는 동안 시간이 걸린다는 것을 알린다", () => {
    mockFetch(new Promise(() => {}) as never);
    render(<ReportViewer input={INPUT} />);

    expect(screen.getByText(/보고서를 만들고 있습니다/)).toBeInTheDocument();
  });

  it("보관된 PDF를 iframe으로 띄운다", async () => {
    mockFetch(pdfResponse());
    render(<ReportViewer input={INPUT} />);

    await waitFor(() => {
      const frame = screen.getByTitle("실행 보고서");
      expect(frame).toHaveAttribute("src", `/api/v1/reports/${REPORT_ID}.pdf`);
    });
  });

  it("새 탭에서 열 수 있는 링크를 함께 둔다", async () => {
    mockFetch(pdfResponse());
    render(<ReportViewer input={INPUT} />);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: /새 탭/ })).toHaveAttribute(
        "href",
        `/api/v1/reports/${REPORT_ID}.pdf`,
      ),
    );
  });

  it("보관이 설정되지 않았으면 그 이름을 알려준다", async () => {
    mockFetch(Response.json({ detail: "보관 미설정" }, { status: 501 }));
    render(<ReportViewer input={INPUT} />);

    await waitFor(() =>
      expect(screen.getByText(/REPORT_ARCHIVE_PROVIDER/)).toBeInTheDocument(),
    );
  });

  it("렌더 실패는 서버가 준 원인을 그대로 보여준다", async () => {
    mockFetch(
      Response.json(
        { detail: "PDF를 만들지 못했습니다: 한글 글꼴이 임베드되지 않았습니다" },
        { status: 503 },
      ),
    );
    render(<ReportViewer input={INPUT} />);

    await waitFor(() =>
      expect(screen.getByText(/한글 글꼴/)).toBeInTheDocument(),
    );
  });

  it("고정한 취득 가정을 화면에 밝힌다", () => {
    mockFetch(new Promise(() => {}) as never);
    render(<ReportViewer input={INPUT} />);

    expect(screen.getByText(/고급주택이 아닌 것으로/)).toBeInTheDocument();
  });

  it("전용면적 84㎡ 고정도 취득 가정으로 함께 밝힌다", () => {
    // 고급주택 가정만 공개하고 전용면적 가정을 빠뜨리면, 취득세를 과소
    // 계산하는 쪽으로 미는 가정 하나가 사용자 눈에 닿지 않는다.
    mockFetch(new Promise(() => {}) as never);
    render(<ReportViewer input={INPUT} />);

    expect(screen.getByText(/전용면적은 84㎡/)).toBeInTheDocument();
  });
});
