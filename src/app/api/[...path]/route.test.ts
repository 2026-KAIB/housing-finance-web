import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET, POST } from "./route";
import { requestTimeoutMs } from "./timeout-budget";

const context = (path: string[]) => ({
  params: Promise.resolve({ path }),
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("backend API proxy", () => {
  it("forwards the method, query, and body to FastAPI", async () => {
    vi.stubEnv("BACKEND_API_URL", "http://housing-finance-api:8000");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ simulation_id: "test-id" }, { status: 201 }),
    );
    const request = new NextRequest(
      "http://web.test/api/v1/simulations?preview=true",
      {
        method: "POST",
        body: JSON.stringify({ profile: { age: 29 } }),
        headers: { "content-type": "application/json" },
      },
    );

    const response = await POST(
      request,
      context(["v1", "simulations"]),
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    const [target, init] = fetchMock.mock.calls[0];
    expect(target.toString()).toBe(
      "http://housing-finance-api:8000/api/v1/simulations?preview=true",
    );
    expect(init?.method).toBe("POST");
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      simulation_id: "test-id",
    });
  });

  it("returns 502 when FastAPI cannot be reached", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new TypeError("connection refused"),
    );
    const request = new NextRequest(
      "http://web.test/api/v1/simulations",
    );

    const response = await GET(
      request,
      context(["v1", "simulations"]),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      detail: "Backend API is unavailable",
    });
  });

  it("returns 504 with a timeout detail when the upstream call aborts on timeout", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new DOMException("The operation was aborted", "TimeoutError"),
    );
    const request = new NextRequest("http://web.test/api/v1/reports");

    const response = await POST(request, context(["v1", "reports"]));

    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toEqual({
      detail: "Backend API request timed out",
    });
  });
});

describe("requestTimeoutMs", () => {
  it("보고서 경로는 더 긴 예산(120초)을 받는다", () => {
    expect(requestTimeoutMs(["v1", "reports"])).toBe(120_000);
  });

  it("보고서 하위 경로(PDF GET)도 같은 예산을 받는다", () => {
    expect(requestTimeoutMs(["v1", "reports", "abc123.pdf"])).toBe(120_000);
  });

  it("그 외 경로는 기본 30초를 유지한다", () => {
    expect(requestTimeoutMs(["v1", "simulations"])).toBe(30_000);
    expect(requestTimeoutMs(["health"])).toBe(30_000);
  });
});
