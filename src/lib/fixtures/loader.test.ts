import { describe, expect, it } from "vitest";

import {
  isKnownPersona,
  loadMydata,
  loadPersonaIndex,
  loadProfile,
  loadResult,
  normalizePersonaParam,
} from "./loader";

const SAMPLE = "persona_e_college_student_basic";

describe("loadPersonaIndex", () => {
  it("6명을 검증된 형태로 돌려준다", () => {
    expect(loadPersonaIndex().personas).toHaveLength(6);
  });
});

describe("isKnownPersona", () => {
  it("목록에 있는 id만 통과시킨다", () => {
    expect(isKnownPersona(SAMPLE)).toBe(true);
    expect(isKnownPersona("persona_a_social_starter")).toBe(false);
    expect(isKnownPersona(undefined)).toBe(false);
    expect(isKnownPersona("")).toBe(false);
  });
});

describe("페르소나별 로더", () => {
  it("profile을 파싱해서 돌려준다", async () => {
    const profile = await loadProfile(SAMPLE);
    expect(profile.persona_id).toBe(SAMPLE);
    expect(profile.goal.target_housing_type).toBe("purchase");
  });

  it("mydata를 파싱해서 돌려준다", async () => {
    const mydata = await loadMydata(SAMPLE);
    expect(mydata.derived_by).toBe("fixture-script");
    expect(mydata.accounts.length).toBeGreaterThan(0);
  });

  it("result를 파싱해서 돌려준다", async () => {
    const result = await loadResult(SAMPLE);
    expect(result.status).toBe("COMPLETE");
  });

  it("없는 페르소나는 던진다", async () => {
    await expect(loadProfile("persona_zz_nobody")).rejects.toThrow(
      "알 수 없는 페르소나: persona_zz_nobody",
    );
  });
});

describe("normalizePersonaParam", () => {
  it("문자열은 그대로 돌려준다", () => {
    expect(normalizePersonaParam(SAMPLE)).toBe(SAMPLE);
  });

  it("배열이면 마지막이 아니라 첫 번째 원소를 돌려준다", () => {
    expect(normalizePersonaParam([SAMPLE, "persona_a_social_starter"])).toBe(
      SAMPLE,
    );
  });

  it("빈 배열은 던지지 않고 undefined를 돌려준다", () => {
    expect(normalizePersonaParam([])).toBeUndefined();
  });

  it("undefined는 undefined를 돌려준다", () => {
    expect(normalizePersonaParam(undefined)).toBeUndefined();
  });
});
