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
const NEXT_BLOCKED_REASON_ID = "next-blocked-reason";

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

  // 두 필드만 구독한다. formState.isValid를 쓰면 나이·월소득 등 모든 필드로
  // 잠금 조건이 번져 기존 동작(누르면 에러 표시)이 통째로 바뀐다.
  const [targetRegion, targetPrice] = form.watch([
    "target_region",
    "target_price",
  ]);
  const goalIncomplete = isBlank(targetRegion) || isBlank(targetPrice);
  const nextBlocked = step === 0 && goalIncomplete;

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
              <Button
                type="button"
                variant="brand"
                onClick={goNext}
                disabled={nextBlocked}
                aria-describedby={
                  nextBlocked ? NEXT_BLOCKED_REASON_ID : undefined
                }
              >
                다음
              </Button>
            )}
            {nextBlocked && (
              <p
                id={NEXT_BLOCKED_REASON_ID}
                role="status"
                className="self-center text-xs text-brand-muted"
              >
                희망 주택의 지역과 목표 가격을 입력해주세요.
              </p>
            )}
            {step === STEP_TITLES.length - 1 && (
              <Button type="button" variant="brand" onClick={onSubmit}>
                결과 보기
              </Button>
            )}
          </div>
        </form>
      </FormProvider>
    </section>
  );
}

/**
 * 숫자 입력을 비우면 ""가 오고 defaultValues는 number를 넣으므로 둘 다 받는다.
 * 0은 유효한 금액이므로 falsy 검사로 뭉뚱그리지 않는다.
 */
function isBlank(value: unknown): boolean {
  return value === "" || value === undefined || value === null;
}
