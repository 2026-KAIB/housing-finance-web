"use client";

import type { ReactNode } from "react";
import { useFormContext } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import type { Mydata, PersonaProfile } from "@/lib/contracts/persona";
import { seoulDistrictLabel } from "@/lib/constants/seoul-districts";
import { riskPreferenceLabel } from "@/lib/format/codes";
import { formatYm, formatYmd, parseYmInput } from "@/lib/format/date";
import { formatWon } from "@/lib/format/money";

import { ReadonlyRow } from "./field-row";
import type { InputFormValues } from "./form-schema";
import { ProfileFacts } from "./profile-facts";

export function StepReview({
  profile,
  mydata,
  mydataLoaded,
}: {
  profile: PersonaProfile;
  mydata: Mydata;
  mydataLoaded: boolean;
}) {
  const { watch } = useFormContext<InputFormValues>();
  const values = watch();

  return (
    <div className="grid gap-8">
      <Group title="입력한 정보">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <ReadonlyRow label="나이" value={`만 ${values.age}세`} />
            <ReadonlyRow
              label="가구원수"
              value={`${values.household_size}명`}
            />
            <ReadonlyRow
              label="월 소득"
              value={formatWon(values.monthly_income)}
            />
            <ReadonlyRow
              label="월 평균 지출"
              value={formatWon(values.monthly_average_expense)}
            />
            {values.current_assets !== undefined && (
              <ReadonlyRow
                label="보유 자산"
                value={formatWon(values.current_assets)}
              />
            )}
          </div>

          <div>
            <ReadonlyRow
              label="지역"
              value={seoulDistrictLabel(values.target_region)}
            />
            <ReadonlyRow
              label="목표 가격"
              value={formatWon(values.target_price)}
            />
            <ReadonlyRow
              label="목표 시점"
              value={formatYm(parseYmInput(values.target_move_in_ym))}
            />
            <ReadonlyRow
              label="위험 성향"
              value={riskPreferenceLabel(values.risk_preference)}
            />
            <ReadonlyRow
              label="월 저축 예산"
              value={formatWon(values.monthly_savings_budget)}
            />
            <ReadonlyRow
              label="일시 예치금"
              value={formatWon(values.lump_sum_budget)}
            />
            <ReadonlyRow
              label="비상 예비금"
              value={formatWon(values.emergency_reserve)}
            />
          </div>
        </div>
      </Group>

      <Group title="프로필에서 확인된 정보">
        <ProfileFacts profile={profile} />
      </Group>

      <Group title="연동한 마이데이터">
        {mydataLoaded ? (
          <MydataSummary mydata={mydata} />
        ) : (
          <p className="text-sm text-brand-muted">
            아직 마이데이터를 불러오지 않았습니다. 이전 단계에서 [마이데이터
            불러오기]를 누르면 계좌·예적금·대출·거래내역이 조회됩니다.
          </p>
        )}
      </Group>
    </div>
  );
}

function MydataSummary({ mydata }: { mydata: Mydata }) {
  const demand = mydata.accounts.filter(
    (account) => account.account_kind === "demand",
  ).length;
  const savings = mydata.accounts.filter(
    (account) => account.account_kind === "savings",
  ).length;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">기준일 {formatYmd(mydata.as_of)}</Badge>
        <Badge variant="outline">불러오기 완료</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <ReadonlyRow label="입출금 계좌" value={`${demand}건`} />
          <ReadonlyRow label="예적금 계좌" value={`${savings}건`} />
          <ReadonlyRow label="대출" value={`${mydata.loans.length}건`} />
        </div>
        <div>
          <ReadonlyRow
            label="총 잔액"
            value={formatWon(mydata.totals.total_balance)}
          />
          <ReadonlyRow
            label="대출 잔액"
            value={formatWon(mydata.totals.total_loan_balance)}
          />
        </div>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4">
      <h2 className="text-lg font-bold tracking-[-0.03em]">{title}</h2>
      {children}
    </section>
  );
}
