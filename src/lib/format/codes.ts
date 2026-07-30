import type { PersonaCategory, PortfolioStatus } from "@/lib/contracts/persona";

function lookup(table: Record<string, string>, code: string): string {
  return table[code] ?? code;
}

const CATEGORY: Record<PersonaCategory, string> = {
  basic: "기본형",
  affluent: "여유형",
  poor: "취약형",
};

const PORTFOLIO_STATUS: Record<PortfolioStatus, string> = {
  COMPLETE: "배분 완료",
  INFEASIBLE: "배분 불가",
  NO_ALLOCATION_REQUIRED: "배분 불필요",
};

export function categoryLabel(category: PersonaCategory): string {
  return CATEGORY[category];
}

export function portfolioStatusLabel(status: PortfolioStatus): string {
  return PORTFOLIO_STATUS[status];
}

export function housingTypeLabel(code: string): string {
  return lookup(
    {
      monthly_rent: "월세",
      jeonse: "전세",
      owned: "자가",
      living_with_parents: "부모님과 거주",
      dormitory: "기숙사",
    },
    code,
  );
}

export function riskPreferenceLabel(code: string): string {
  return lookup(
    { stability: "안정형", balanced: "중립형", aggressive: "공격형" },
    code,
  );
}

export function educationStatusLabel(code: string): string {
  return lookup(
    {
      university_student: "대학 재학",
      university_leave: "대학 휴학",
      graduated: "졸업",
      high_school: "고등학교 졸업",
    },
    code,
  );
}

export function employmentTypeLabel(code: string): string {
  return lookup(
    {
      part_time: "아르바이트",
      full_time: "정규직",
      contract: "계약직",
      freelance: "프리랜서",
      none: "무직",
    },
    code,
  );
}

export function tuitionPayerLabel(code: string): string {
  return lookup(
    { parents: "부모님", self: "본인", scholarship: "장학금", loan: "학자금대출" },
    code,
  );
}

export function liquidityPreferenceLabel(code: string): string {
  return lookup({ high: "높음", medium: "보통", low: "낮음" }, code);
}
