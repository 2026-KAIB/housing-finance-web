"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { FormProvider, type Resolver, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import type { Mydata, PersonaProfile } from "@/lib/contracts/persona";

import {
  type InputFormValues,
  inputFormSchema,
  toFormValues,
} from "./form-schema";
import { StepBasic } from "./step-basic";

const STEP_TITLES = ["기본정보", "마이데이터", "목표설정"] as const;

export function InputWizard({
  personaId,
  profile,
  mydata,
}: {
  personaId: string;
  profile: PersonaProfile;
  mydata: Mydata;
}) {
  const [step, setStep] = useState(0);
  const defaultValues = toFormValues(profile);

  const form = useForm<InputFormValues>({
    // zod 4's `z.coerce.number()` widens the schema's *input* type to `unknown`
    // (coercion accepts anything), so `zodResolver`'s inferred input generic no
    // longer structurally matches `InputFormValues`. The value RHF actually
    // receives at runtime is the parsed *output* of the schema, which does
    // match `InputFormValues` — this cast asserts that, nothing more.
    resolver: zodResolver(inputFormSchema) as Resolver<InputFormValues>,
    defaultValues,
    mode: "onSubmit",
  });

  async function goNext() {
    if (step === 0) {
      const valid = await form.trigger();
      if (!valid) return;
    }

    setStep((current) => Math.min(current + 1, STEP_TITLES.length - 1));
  }

  return (
    <section className="py-12">
      <p className="m-0 font-bold text-accent">{profile.display_name}</p>
      <h1 className="mb-6 text-3xl font-bold tracking-[-0.04em]">
        step {step + 1}. {STEP_TITLES[step]}
      </h1>

      <FormProvider {...form}>
        <form onSubmit={(event) => event.preventDefault()}>
          {step === 0 && <StepBasic profile={profile} />}
          {step === 1 && (
            <h2 className="text-xl font-bold">마이데이터 불러오기</h2>
          )}
          {step === 2 && <h2 className="text-xl font-bold">목표설정</h2>}

          <div className="mt-8 flex gap-2">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((current) => current - 1)}
              >
                이전
              </Button>
            )}
            {step < STEP_TITLES.length - 1 && (
              <Button type="button" onClick={goNext}>
                다음
              </Button>
            )}
          </div>
        </form>
      </FormProvider>
    </section>
  );
}
