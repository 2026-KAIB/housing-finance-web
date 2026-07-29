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
      target_price: "5000000",
      target_monthly_rent: "200000",
      target_management_fee: "50000",
      target_move_in_ym: "202807",
      risk_preference: "stability",
      monthly_savings_budget: "100000",
      lump_sum_budget: "300000",
      emergency_reserve: "700000",
    });

    expect(parsed.age).toBe(25);
    expect(parsed.monthly_income).toBe(800000);
  });

  it("목표 시점이 YYYYMM이 아니면 거부한다", () => {
    const result = inputFormSchema.safeParse({
      age: 25,
      household_size: 3,
      monthly_income: 800000,
      monthly_average_expense: 700000,
      target_price: 5000000,
      target_monthly_rent: 200000,
      target_management_fee: 50000,
      target_move_in_ym: "2028-07",
      risk_preference: "stability",
      monthly_savings_budget: 100000,
      lump_sum_budget: 300000,
      emergency_reserve: 700000,
    });

    expect(result.success).toBe(false);
  });
});

describe("금액 필드(won)", () => {
  const validInput = {
    age: 25,
    household_size: 3,
    monthly_income: 800000,
    monthly_average_expense: 700000,
    target_price: 5000000,
    target_monthly_rent: 200000,
    target_management_fee: 50000,
    target_move_in_ym: "202807",
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
    expect(values.target_move_in_ym).toBe("202807");
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
