import { describe, expect, it } from "vitest";

import {
  categoryLabel,
  educationStatusLabel,
  employmentTypeLabel,
  housingStatusLabel,
  housingTypeLabel,
  liquidityPreferenceLabel,
  loanTermLabel,
  portfolioStatusLabel,
  riskPreferenceLabel,
  tuitionPayerLabel,
} from "./codes";

describe("codes", () => {
  it("카테고리를 한글로 바꾼다", () => {
    expect(categoryLabel("basic")).toBe("기본형");
    expect(categoryLabel("affluent")).toBe("여유형");
    expect(categoryLabel("poor")).toBe("취약형");
  });

  it("포트폴리오 상태를 한글로 바꾼다", () => {
    expect(portfolioStatusLabel("COMPLETE")).toBe("배분 완료");
    expect(portfolioStatusLabel("INFEASIBLE")).toBe("배분 불가");
    expect(portfolioStatusLabel("NO_ALLOCATION_REQUIRED")).toBe("배분 불필요");
  });

  it("프로필 코드값을 한글로 바꾼다", () => {
    expect(housingTypeLabel("monthly_rent")).toBe("월세");
    expect(housingTypeLabel("living_with_parents")).toBe("부모님과 거주");
    expect(riskPreferenceLabel("stability")).toBe("안정형");
    expect(educationStatusLabel("university_student")).toBe("대학 재학");
    expect(employmentTypeLabel("part_time")).toBe("아르바이트");
    expect(tuitionPayerLabel("parents")).toBe("부모님");
    expect(liquidityPreferenceLabel("high")).toBe("높음");
  });

  it("매매 목표를 한국어로 옮긴다", () => {
    expect(housingTypeLabel("purchase")).toBe("매매");
  });

  it("모르는 코드는 원문을 그대로 돌려준다", () => {
    expect(housingTypeLabel("villa")).toBe("villa");
    expect(riskPreferenceLabel("aggressive_x")).toBe("aggressive_x");
  });
});

describe("housingStatusLabel", () => {
  it("다섯 구분을 한국어로 옮긴다", () => {
    expect(housingStatusLabel("NO_HOUSE")).toBe("무주택");
    expect(housingStatusLabel("FIRST_HOME_BUYER")).toBe("생애최초 주택구입");
    expect(housingStatusLabel("ONE_HOUSE_DISPOSAL_PLEDGED")).toBe("1주택 처분조건부");
    expect(housingStatusLabel("ONE_HOUSE_KEEPING")).toBe("1주택 미처분 추가구입");
    expect(housingStatusLabel("MULTI_HOUSE")).toBe("2주택 이상");
  });

  it("모르는 코드는 코드 그대로 보여준다", () => {
    // 임의로 뭉개면 화면이 사실과 달라진다.
    expect(housingStatusLabel("SOMETHING_ELSE")).toBe("SOMETHING_ELSE");
  });
});

describe("loanTermLabel", () => {
  it("개월을 연 단위로 보여준다", () => {
    expect(loanTermLabel(360)).toBe("30년 (360개월)");
    expect(loanTermLabel(120)).toBe("10년 (120개월)");
  });
});
