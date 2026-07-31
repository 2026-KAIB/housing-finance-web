import { describe, expect, it } from "vitest";

import { loadProfile } from "@/lib/fixtures/loader";

import { changedFields, inputFormSchema, toFormValues } from "./form-schema";

const SAMPLE = "persona_e_college_student_basic";

describe("inputFormSchema", () => {
  it("문자열로 들어온 숫자를 숫자로 바꾼다", () => {
    const parsed = inputFormSchema.parse({
      age: "25",
      household_size: "3",
      monthly_income: "800000",
      monthly_average_expense: "700000",
      target_region: "11650",
      target_price: "5000000",
      target_move_in_ym: "2028-07",
      risk_preference: "stability",
      monthly_savings_budget: "100000",
      lump_sum_budget: "300000",
      emergency_reserve: "700000",
    });

    expect(parsed.age).toBe(25);
    expect(parsed.monthly_income).toBe(800000);
  });

  it("목표 시점이 YYYY-MM이 아니면 거부한다", () => {
    const base = {
      age: 25,
      household_size: 3,
      monthly_income: 800000,
      monthly_average_expense: 700000,
      target_region: "11650",
      target_price: 5000000,
      risk_preference: "stability",
      monthly_savings_budget: 100000,
      lump_sum_budget: 300000,
      emergency_reserve: 700000,
    };

    for (const invalid of ["202807", "2028-13", "2028-7", "2028/07"]) {
      const result = inputFormSchema.safeParse({
        ...base,
        target_move_in_ym: invalid,
      });

      expect(result.success, invalid).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          "YYYY-MM 형식으로 입력하세요",
        );
      }
    }

    expect(
      inputFormSchema.safeParse({ ...base, target_move_in_ym: "2028-07" })
        .success,
    ).toBe(true);
  });
});

describe("금액 필드(won)", () => {
  const validInput = {
    age: 25,
    household_size: 3,
    monthly_income: 800000,
    monthly_average_expense: 700000,
    target_region: "11650",
    target_price: 5000000,
    target_move_in_ym: "2028-07",
    risk_preference: "stability",
    monthly_savings_budget: 100000,
    lump_sum_budget: 300000,
    emergency_reserve: 700000,
  };

  it("빈 문자열이면 거부한다", () => {
    const result = inputFormSchema.safeParse({
      ...validInput,
      monthly_income: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("금액을 입력하세요");
    }
  });

  it("문자열 '0'과 숫자 0은 허용한다", () => {
    const fromString = inputFormSchema.parse({
      ...validInput,
      monthly_income: "0",
    });
    const fromNumber = inputFormSchema.parse({
      ...validInput,
      monthly_income: 0,
    });

    expect(fromString.monthly_income).toBe(0);
    expect(fromNumber.monthly_income).toBe(0);
  });

  it("정상 금액은 통과한다", () => {
    const parsed = inputFormSchema.parse({
      ...validInput,
      monthly_income: "800000",
    });

    expect(parsed.monthly_income).toBe(800000);
  });

  it("음수는 거부한다", () => {
    const result = inputFormSchema.safeParse({
      ...validInput,
      monthly_income: "-5",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("0 이상이어야 합니다");
    }
  });
});

describe("toFormValues", () => {
  it("프로필을 폼 기본값으로 옮긴다", async () => {
    const values = toFormValues(await loadProfile(SAMPLE));

    expect(values.age).toBe(25);
    expect(values.monthly_income).toBe(800000);
    expect(values.target_price).toBe(5000000);
    expect(values.target_move_in_ym).toBe("2028-07");
    expect(values.monthly_savings_budget).toBe(100000);
  });

  it("current_assets가 없는 프로필도 처리한다", async () => {
    expect(toFormValues(await loadProfile(SAMPLE)).current_assets).toBeUndefined();
  });
});

describe("changedFields", () => {
  it("바뀐 필드 이름을 돌려준다", async () => {
    const defaults = toFormValues(await loadProfile(SAMPLE));
    const changed = changedFields(defaults, {
      ...defaults,
      target_price: 9000000,
      monthly_savings_budget: 250000,
    });

    expect(changed.sort()).toEqual(["monthly_savings_budget", "target_price"]);
  });

  it("그대로면 빈 배열이다", async () => {
    const defaults = toFormValues(await loadProfile(SAMPLE));
    expect(changedFields(defaults, { ...defaults })).toEqual([]);
  });
});

describe("target_region", () => {
  const validInput = {
    age: 25,
    household_size: 3,
    monthly_income: 800000,
    monthly_average_expense: 700000,
    target_region: "11650",
    target_price: 5000000,
    target_move_in_ym: "2028-07",
    risk_preference: "stability",
    monthly_savings_budget: 100000,
    lump_sum_budget: 300000,
    emergency_reserve: 700000,
  };

  it("서울 구 코드를 통과시킨다", () => {
    expect(inputFormSchema.parse(validInput).target_region).toBe("11650");
  });

  it("전체 센티널을 통과시킨다", () => {
    expect(
      inputFormSchema.parse({ ...validInput, target_region: "ALL" })
        .target_region,
    ).toBe("ALL");
  });
});

describe("toFormValues의 지역 프리필", () => {
  it("픽스처의 서울 구 코드를 그대로 옮긴다", async () => {
    // persona_e는 커밋 0e168c6에서 30200(대전 유성) → 11650(서초구)으로 정리됐다.
    expect(toFormValues(await loadProfile(SAMPLE)).target_region).toBe("11650");
  });

  it("서울 밖 코드는 미선택으로 떨어뜨린다", async () => {
    // 픽스처에는 더 이상 서울 밖 값이 없으므로 합성 프로필로 방어 경로를 검증한다.
    const profile = await loadProfile(SAMPLE);
    const outside = {
      ...profile,
      goal: { ...profile.goal, target_region: "30200" },
    };

    expect(toFormValues(outside).target_region).toBe("");
  });
});
