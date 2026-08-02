import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type InputFormValues, toFormValues } from "@/features/input/form-schema";
import { loadProfile } from "@/lib/fixtures/loader";
import { saveInputHandoff } from "@/lib/session/input-handoff";

import { LiveDashboard } from "./live-dashboard";

// persona_f는 프로필이 완전하다(current_assets 포함) — 위저드를 거치지 않고
// 바로 들어와도 계산이 되는 "정상 경로"를 검증한다.
const PERSONA_F = "persona_f_college_student_02_basic";
// persona_e는 프로필에 current_assets가 없다 — 관문이 실제로 막는지를
// 검증하는 유일한 목적으로 쓴다.
const PERSONA_E = "persona_e_college_student_basic";

const SIMULATION = {
  as_of: "2026-08-02",
  savings_portfolio: {
    run_status: "COMPLETED",
    section_schema_version: "savings-portfolio@1.1.0",
    engine_status: "COMPLETE",
    result: {
      status: "COMPLETE",
      coverage_ratio: "1",
      monthly_allocated: "500000",
      monthly_unallocated: "0",
      lump_sum_allocated: "0",
      lump_sum_unallocated: "0",
      expected_total_principal: "12000000",
      expected_maturity_amount: "12300000",
      expected_net_interest: "300000",
      allocations: [],
      reasons: [],
      final_policy_status: "PASS",
      final_policy_valid: true,
      validation_reasons: [],
    },
    missing_inputs: [],
    reasons: [],
  },
};

function mockFetch(handler: (url: string) => Response | Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo) => handler(String(input))));
}

// 앞선 테스트가 남긴 핸드오프 값으로 통과하면 뒤따르는 테스트는 아무것도
// 검증하지 않는다 — 특히 "프로필에 없는 값" 테스트는 sessionStorage가 비어
// 있어야만 의미가 있다.
beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => vi.unstubAllGlobals());

describe("LiveDashboard", () => {
  it("계산 결과로 포트폴리오를 그린다", async () => {
    mockFetch(() => Response.json(SIMULATION));
    render(<LiveDashboard profile={await loadProfile(PERSONA_F)} />);

    await waitFor(() =>
      expect(screen.getByText("예적금 포트폴리오")).toBeInTheDocument(),
    );
    expect(screen.getByText("정책 통과")).toBeInTheDocument();
  });

  it("계산 중에는 그 사실을 알린다", async () => {
    mockFetch(() => new Promise(() => {}) as never);
    render(<LiveDashboard profile={await loadProfile(PERSONA_F)} />);

    expect(screen.getByText(/계산하고 있습니다/)).toBeInTheDocument();
  });

  it("백엔드가 꺼져 있으면 그렇게 말한다", async () => {
    // 보고서 호출(/reports)은 카드와 별개로 나간다(Step 4b). 이 테스트는
    // 카드 쪽 오류 문구만 보므로 보고서 호출은 응답하지 않게 두어, 같은
    // 문구가 두 번 뜨는 것을 막는다.
    mockFetch((url) =>
      url.includes("/simulations")
        ? Response.json({ detail: "Backend API is unavailable" }, { status: 502 })
        : (new Promise(() => {}) as never),
    );
    render(<LiveDashboard profile={await loadProfile(PERSONA_F)} />);

    await waitFor(() =>
      expect(screen.getByText(/실행 중인지/)).toBeInTheDocument(),
    );
  });

  it("프로필에 없는 값이 있으면 부르지 않고 그 필드 이름을 알린다", async () => {
    // persona_e는 프로필에 current_assets가 없다. 그대로 보내면 엔진이
    // 필수로 받는 liquid_assets에 undefined가 도달한다. 0으로 메우지도,
    // 조용히 실패하지도 않고 무엇을 채워야 하는지 이름으로 말한다.
    const fetchSpy = vi.fn(() => Response.json(SIMULATION));
    vi.stubGlobal("fetch", fetchSpy);

    render(<LiveDashboard profile={await loadProfile(PERSONA_E)} />);

    expect(screen.getByText(/보유 자산/)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("위저드를 거친 값이 있으면 프로필이 불완전해도 계산한다", async () => {
    // persona_e는 프로필에 current_assets가 없지만, 위저드를 통과했다면
    // 사용자가 직접 채운 값이 핸드오프에 있다. 관문은 그 값을 본다.
    const profile = await loadProfile(PERSONA_E);
    saveInputHandoff(PERSONA_E, {
      ...toFormValues(profile),
      current_assets: 8000000,
    } as InputFormValues);

    const fetchSpy = vi.fn(() => Response.json(SIMULATION));
    vi.stubGlobal("fetch", fetchSpy);
    render(<LiveDashboard profile={profile} />);

    await waitFor(() =>
      expect(screen.getByText("예적금 포트폴리오")).toBeInTheDocument(),
    );
  });

  it("카드가 아직 안 떠도 보고서 요청을 시작한다", async () => {
    // 카드 호출은 응답하지 않게 두고, 보고서 호출이 나갔는지만 본다.
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: RequestInfo) => {
        calls.push(String(url));
        return new Promise(() => {}) as never;
      }),
    );

    render(<LiveDashboard profile={await loadProfile(PERSONA_F)} />);

    await waitFor(() =>
      expect(calls.some((url) => url.includes("/reports"))).toBe(true),
    );
  });

  it("카드 호출이 실패해도 보고서는 따로 시도한다", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: RequestInfo) => {
        calls.push(String(url));
        return String(url).includes("/simulations")
          ? Response.json({ detail: "Backend API is unavailable" }, { status: 502 })
          : (new Promise(() => {}) as never);
      }),
    );

    render(<LiveDashboard profile={await loadProfile(PERSONA_F)} />);

    await waitFor(() => expect(screen.getByText(/실행 중인지/)).toBeInTheDocument());
    expect(calls.some((url) => url.includes("/reports"))).toBe(true);
  });
});
