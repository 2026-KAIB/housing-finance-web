import { render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import type { InputFormValues } from "./form-schema";
import { LoanFields } from "./loan-fields";

function Harness({ defaults }: { defaults: Partial<InputFormValues> }) {
  const form = useForm<InputFormValues>({
    defaultValues: {
      months: 360,
      housing_status: "NO_HOUSE",
      monthly_essential_expense: 1200000,
      ...defaults,
    } as InputFormValues,
  });
  return (
    <FormProvider {...form}>
      <LoanFields />
    </FormProvider>
  );
}

describe("LoanFields", () => {
  it("만기 네 가지를 연 단위로 보여준다", () => {
    render(<Harness defaults={{}} />);

    expect(screen.getByRole("option", { name: "30년 (360개월)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "10년 (120개월)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "40년 (480개월)" })).toBeInTheDocument();
  });

  it("주택 보유 상태 다섯 가지를 한국어로 보여준다", () => {
    render(<Harness defaults={{}} />);

    expect(screen.getByRole("option", { name: "무주택" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "생애최초 주택구입" })).toBeInTheDocument();
  });

  it("생애최초를 고르면 한도가 커진다는 것을 알린다", () => {
    render(<Harness defaults={{ housing_status: "FIRST_HOME_BUYER" }} />);

    expect(screen.getByText(/LTV/)).toBeInTheDocument();
  });

  it("필수생활비가 무엇인지 설명한다", () => {
    render(<Harness defaults={{}} />);

    expect(screen.getByText(/총지출이 아니라/)).toBeInTheDocument();
  });
});
