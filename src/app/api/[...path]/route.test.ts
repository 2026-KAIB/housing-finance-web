import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET, POST } from "./route";

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
});
