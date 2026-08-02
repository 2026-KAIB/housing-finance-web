import { afterEach, describe, expect, it, vi } from "vitest";

import { postReportPdf, postSimulation } from "./client";
import { ApiError } from "./errors";
import type { SimulationInputPayload } from "./simulation-input";

// 이 파일의 페이로드 값 자체는 의미가 없다 — client.ts는 SimulationInputPayload를
// 검증하지 않고 그대로 JSON.stringify해 보낸다. 최소한의 모양만 갖춘다.
const INPUT = {} as SimulationInputPayload;

function mockFetch(response: Response | (() => Response)) {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => (typeof response === "function" ? response() : response)),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("postSimulation", () => {
  it("성공하면 응답 본문을 그대로 돌려준다", async () => {
    mockFetch(Response.json({ as_of: "2026-08-02" }));

    const result = await postSimulation(INPUT);

    expect(result).toEqual({ as_of: "2026-08-02" });
  });

  it("실패하면 상태 코드와 detail을 담은 ApiError를 던진다", async () => {
    mockFetch(
      Response.json({ detail: "Backend API is unavailable" }, { status: 502 }),
    );

    await expect(postSimulation(INPUT)).rejects.toMatchObject({
      status: 502,
      detail: "Backend API is unavailable",
    });
  });

  it("422 detail이 리스트여도(FastAPI 검증 오류) 필드 이름을 잃지 않는다", async () => {
    mockFetch(
      Response.json(
        {
          detail: [
            {
              loc: ["body", "financial_snapshot", "emergency_reserve"],
              msg: "emergency_reserve must not exceed liquid_assets",
              type: "value_error",
            },
          ],
        },
        { status: 422 },
      ),
    );

    const error = (await postSimulation(INPUT).catch((e) => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.detail).toContain("emergency_reserve");
    expect(error.detail).toContain("must not exceed liquid_assets");
  });
});

describe("postReportPdf", () => {
  it("X-Report-Id 헤더의 id를 돌려준다", async () => {
    mockFetch(
      new Response(null, {
        status: 200,
        headers: { "X-Report-Id": "report-123" },
      }),
    );

    const reportId = await postReportPdf(INPUT);

    expect(reportId).toBe("report-123");
  });

  it("응답이 성공인데 X-Report-Id가 없으면 던진다", async () => {
    // 응답 바이트를 쓰지 않고 id로 GET을 다시 거는 게 이 함수의 계약이다.
    // id가 없으면 그 계약이 깨진 것이므로 성공을 가장하지 않는다.
    mockFetch(new Response(null, { status: 200 }));

    await expect(postReportPdf(INPUT)).rejects.toMatchObject({
      detail: "응답에 보고서 id가 없습니다.",
    });
  });

  it("실패하면 상태 코드와 detail을 담은 ApiError를 던진다", async () => {
    mockFetch(
      Response.json(
        { detail: "PDF를 만들지 못했습니다: 글꼴 없음" },
        { status: 503 },
      ),
    );

    await expect(postReportPdf(INPUT)).rejects.toMatchObject({
      status: 503,
      detail: "PDF를 만들지 못했습니다: 글꼴 없음",
    });
  });
});
