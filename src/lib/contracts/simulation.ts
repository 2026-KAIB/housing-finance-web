export type UserProfile = {
  age: number;
  household_size: number;
  annual_income: string;
  is_first_home_buyer: boolean;
  is_married: boolean;
  region_code?: string | null;
};

export type HousingGoal = {
  target_price: string;
  target_date: string;
  region_code?: string | null;
};

export type FinancialSnapshot = {
  monthly_income: string;
  monthly_expense: string;
  liquid_assets: string;
  housing_assets: string;
  total_debt: string;
  monthly_debt_payment: string;
};

export type SimulationInput = {
  profile: UserProfile;
  housing_goal: HousingGoal;
  financial_snapshot: FinancialSnapshot;
};

export type EngineSummary = {
  status: string;
  score?: string | null;
  reasons: string[];
};

export type SimulationResult = {
  simulation_id: string;
  calculated_at: string;
  cashflow: EngineSummary;
  savings: EngineSummary;
  loan: EngineSummary;
  recommendation: EngineSummary;
};

