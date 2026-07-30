"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormProvider, type Resolver, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import type {
  Mydata,
  PersonaIndexEntry,
  PersonaProfile,
} from "@/lib/contracts/persona";

import {
  type InputFormValues,
  changedFields,
  inputFormSchema,
  toFormValues,
} from "./form-schema";
import { StepInput } from "./step-input";
import { StepMydata } from "./step-mydata";
import { StepReview } from "./step-review";

const STEP_TITLES = ["정보 입력", "마이데이터 연동", "입력 확인"] as const;

export function InputWizard({
  personaId,
  personas,
  profile,
  mydata,
}: {
  personaId: string;
  personas: PersonaIndexEntry[];
  profile: PersonaProfile;
  mydata: Mydata;
}) {
  const [step, setStep] = useState(0);
  // step 2에서 불러온 상태를 step 3이 보고해야 하므로 위저드가 쥔다.
  const [mydataLoaded, setMydataLoaded] = useState(false);
  const router = useRouter();
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
    // 사용자가 입력하는 값은 전부 step 1에 있으므로 여기서만 검증한다.
    if (step === 0) {
      const valid = await form.trigger();
      if (!valid) return;
    }

    setStep((current) => Math.min(current + 1, STEP_TITLES.length - 1));
  }

  const onSubmit = form.handleSubmit((values) => {
    const edited = changedFields(defaultValues, values).length > 0;
    router.push(
      `/dashboard?persona=${personaId}${edited ? "&edited=1" : ""}`,
    );
  });

  return (
    <section className="py-12">
      <p className="m-0 font-bold text-accent">{profile.display_name}</p>
      <h1 className="mb-6 text-3xl font-bold tracking-[-0.04em]">
        step {step + 1}. {STEP_TITLES[step]}
      </h1>

      <FormProvider {...form}>
        <form onSubmit={(event) => event.preventDefault()}>
          {step === 0 && (
            <StepInput
              personaId={personaId}
              personas={personas}
              profile={profile}
            />
          )}
          {step === 1 && (
            <StepMydata
              personaId={personaId}
              mydata={mydata}
              loaded={mydataLoaded}
              onLoad={() => setMydataLoaded(true)}
            />
          )}
          {step === 2 && (
            <StepReview
              profile={profile}
              mydata={mydata}
              mydataLoaded={mydataLoaded}
            />
          )}

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
            {step === STEP_TITLES.length - 1 && (
              <Button type="button" onClick={onSubmit}>
                결과 보기
              </Button>
            )}
          </div>
        </form>
      </FormProvider>
    </section>
  );
}
