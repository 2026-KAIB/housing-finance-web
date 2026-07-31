import { describe, expect, it } from "vitest";

import {
  ALL_DISTRICTS,
  SEOUL_DISTRICTS,
  isSeoulDistrict,
  seoulDistrictLabel,
} from "./seoul-districts";

describe("SEOUL_DISTRICTS", () => {
  it("서울 자치구 25개를 담는다", () => {
    expect(SEOUL_DISTRICTS).toHaveLength(25);
  });

  it("행정표준코드 오름차순이다", () => {
    const codes = SEOUL_DISTRICTS.map((district) => district.code);
    expect(codes).toEqual([...codes].sort());
  });

  it("종로구에서 시작해 강동구로 끝난다", () => {
    expect(SEOUL_DISTRICTS[0]).toEqual({ code: "11110", name: "종로구" });
    expect(SEOUL_DISTRICTS[24]).toEqual({ code: "11740", name: "강동구" });
  });

  it("코드와 이름에 중복이 없다", () => {
    const codes = new Set(SEOUL_DISTRICTS.map((district) => district.code));
    const names = new Set(SEOUL_DISTRICTS.map((district) => district.name));
    expect(codes.size).toBe(25);
    expect(names.size).toBe(25);
  });

  it("전체 센티널은 구 목록에 들어 있지 않다", () => {
    expect(
      SEOUL_DISTRICTS.some((district) => district.code === ALL_DISTRICTS),
    ).toBe(false);
  });
});

describe("isSeoulDistrict", () => {
  it("서울 구 코드를 통과시킨다", () => {
    expect(isSeoulDistrict("11680")).toBe(true);
    expect(isSeoulDistrict("11110")).toBe(true);
  });

  it("서울 밖 코드를 거부한다", () => {
    // 픽스처 정리 전에 쓰이던 값들 — 부산·대구·광주·대전
    for (const code of ["26440", "27200", "29170", "30200", "41135"]) {
      expect(isSeoulDistrict(code), code).toBe(false);
    }
  });

  it("빈 문자열과 전체 센티널을 거부한다", () => {
    expect(isSeoulDistrict("")).toBe(false);
    expect(isSeoulDistrict(ALL_DISTRICTS)).toBe(false);
  });
});

describe("seoulDistrictLabel", () => {
  it("구 코드를 구 이름으로 바꾼다", () => {
    expect(seoulDistrictLabel("11680")).toBe("강남구");
    expect(seoulDistrictLabel("11650")).toBe("서초구");
  });

  it("전체 센티널은 요약용 문구로 바꾼다", () => {
    expect(seoulDistrictLabel(ALL_DISTRICTS)).toBe("서울 전체");
  });

  it("모르는 코드는 받은 값을 그대로 돌려준다", () => {
    expect(seoulDistrictLabel("30200")).toBe("30200");
    expect(seoulDistrictLabel("")).toBe("");
  });
});
