import type { PersonaProfile } from "@/lib/contracts/persona";
import {
  educationStatusLabel,
  employmentTypeLabel,
  housingTypeLabel,
  liquidityPreferenceLabel,
  tuitionPayerLabel,
} from "@/lib/format/codes";
import { formatYmd } from "@/lib/format/date";
import { formatKoreanUnit } from "@/lib/format/money";

import { ReadonlyRow } from "./field-row";

/** 프로필에 담겨 있으나 사용자가 폼에서 고치지 않는 값들. */
export function ProfileFacts({ profile }: { profile: PersonaProfile }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <ReadonlyRow
          label="학적"
          value={educationStatusLabel(profile.basic.education_status)}
        />
        <ReadonlyRow
          label="고용 형태"
          value={employmentTypeLabel(profile.basic.employment_type)}
        />
        <ReadonlyRow
          label="등록금 납부자"
          value={tuitionPayerLabel(profile.basic.tuition_payer)}
        />
        <ReadonlyRow
          label="현재 거주 형태"
          value={housingTypeLabel(profile.basic.current_housing_type)}
        />
        <ReadonlyRow
          label="부모님과 거주"
          value={profile.basic.lives_with_parents ? "예" : "아니오"}
        />
      </div>

      <div>
        <ReadonlyRow
          label="연 소득 (증빙)"
          value={formatKoreanUnit(profile.finance.annual_income_verified)}
        />
        {profile.finance.monthly_debt_payment !== undefined && (
          <ReadonlyRow
            label="월 부채 상환액"
            value={formatKoreanUnit(profile.finance.monthly_debt_payment)}
          />
        )}
        <ReadonlyRow
          label="유동성 선호"
          value={liquidityPreferenceLabel(profile.savings.liquidity_preference)}
        />
        <ReadonlyRow
          label="원금 손실 감수"
          value={profile.savings.accepts_principal_risk ? "예" : "아니오"}
        />
        <ReadonlyRow
          label="자금 필요 시점"
          value={formatYmd(profile.savings.fund_needed_date)}
        />
      </div>
    </div>
  );
}
