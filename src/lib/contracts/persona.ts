import { z } from "zod";

const YMD = /^\d{8}$/;
const YM = /^\d{6}$/;
const MASKED_ACCOUNT = /^\d{4}-\*\*-\*\*\d{4}$/;

export const sourceSchema = z.object({
  generator: z.string(),
  as_of: z.string(),
});

export const personaCategorySchema = z.enum(["basic", "affluent", "poor"]);

export const portfolioStatusSchema = z.enum([
  "COMPLETE",
  "INFEASIBLE",
  "NO_ALLOCATION_REQUIRED",
]);

export const personaIndexEntrySchema = z.object({
  persona_id: z.string().min(1),
  display_name: z.string().min(1),
  category: personaCategorySchema,
  headline: z.object({
    age: z.number().int(),
    monthly_income: z.number(),
    monthly_expense: z.number(),
    target_price: z.number(),
    target_move_in_ym: z.string().regex(YM),
  }),
  portfolio_status: portfolioStatusSchema,
});

export const personaIndexSchema = z.object({
  as_of: z.string(),
  personas: z.array(personaIndexEntrySchema),
});

export const personaProfileSchema = z.object({
  persona_id: z.string().min(1),
  display_name: z.string().min(1),
  category: personaCategorySchema,
  basic: z.object({
    birth_date: z.string().regex(YMD),
    age: z.number().int(),
    education_status: z.string(),
    military_service_status: z.string(),
    employment_type: z.string(),
    marital_status: z.string(),
    household_size: z.number().int(),
    lives_with_parents: z.boolean(),
    tuition_payer: z.string(),
    current_housing_type: z.string(),
  }),
  goal: z.object({
    target_housing_type: z.string(),
    target_region: z.string(),
    target_price: z.number(),
    target_lease_deposit: z.number(),
    target_monthly_rent: z.number(),
    target_management_fee: z.number(),
    target_move_in_ym: z.string().regex(YM),
    risk_preference: z.string(),
  }),
  finance: z.object({
    annual_income_verified: z.number(),
    monthly_income: z.number(),
    monthly_average_expense: z.number(),
    current_assets: z.number().optional(),
    monthly_debt_payment: z.number().optional(),
  }),
  savings: z.object({
    fund_needed_date: z.string().regex(YMD),
    monthly_savings_budget: z.number(),
    lump_sum_budget: z.number(),
    emergency_reserve: z.number(),
    liquidity_preference: z.string(),
    accepts_principal_risk: z.boolean(),
    maximum_recommended_products: z.number().int(),
  }),
  source: sourceSchema,
});

export const mydataAccountSchema = z.object({
  account_num_masked: z.string().regex(MASKED_ACCOUNT),
  prod_name: z.string(),
  account_type: z.string(),
  account_type_label: z.string(),
  account_kind: z.enum(["demand", "savings"]),
  saving_method: z.string(),
  saving_method_label: z.string(),
  balance_amt: z.number(),
  withdrawable_amt: z.number(),
  offered_rate: z.number(),
  issue_date: z.string().regex(YMD),
  exp_date: z.string().regex(YMD).optional(),
  commit_amt: z.number().optional(),
  monthly_paid_in_amt: z.number().optional(),
  last_paid_in_cnt: z.number().int().optional(),
  has_transactions: z.boolean(),
});

export const mydataLoanSchema = z.object({
  account_num_masked: z.string().regex(MASKED_ACCOUNT),
  prod_name: z.string(),
  account_type: z.string(),
  account_type_label: z.string(),
  balance_amt: z.number(),
  loan_principal: z.number(),
  last_offered_rate: z.number(),
  repay_method: z.string(),
  repay_method_label: z.string(),
  issue_date: z.string().regex(YMD),
  exp_date: z.string().regex(YMD),
  next_repay_date: z.string().regex(YMD),
});

export const monthlySummarySchema = z.object({
  ym: z.string().regex(YM),
  income: z.number(),
  expense: z.number(),
  interest: z.number(),
  net: z.number(),
});

export const mydataSchema = z.object({
  persona_id: z.string().min(1),
  as_of: z.string().regex(YMD),
  accounts: z.array(mydataAccountSchema),
  loans: z.array(mydataLoanSchema),
  monthly_summary: z.array(monthlySummarySchema),
  totals: z.object({
    account_count: z.number().int(),
    loan_count: z.number().int(),
    total_balance: z.number(),
    total_loan_balance: z.number(),
  }),
  derived_by: z.literal("fixture-script"),
  source: sourceSchema,
});

export const transactionSchema = z.object({
  trans_dtime: z.string().regex(/^\d{14}$/),
  trans_no: z.string(),
  trans_type: z.string(),
  trans_type_label: z.string(),
  trans_class: z.string(),
  trans_amt: z.number(),
  balance_amt: z.number(),
  trans_memo: z.string(),
});

export const transactionsSchema = z.object({
  persona_id: z.string().min(1),
  accounts: z.record(
    z.string(),
    z.object({ trans_list: z.array(transactionSchema) }),
  ),
  source: sourceSchema,
});

export type PersonaIndex = z.infer<typeof personaIndexSchema>;
export type PersonaIndexEntry = z.infer<typeof personaIndexEntrySchema>;
export type PersonaProfile = z.infer<typeof personaProfileSchema>;
export type PersonaCategory = z.infer<typeof personaCategorySchema>;
export type PortfolioStatus = z.infer<typeof portfolioStatusSchema>;
export type Mydata = z.infer<typeof mydataSchema>;
export type MydataAccount = z.infer<typeof mydataAccountSchema>;
export type MydataLoan = z.infer<typeof mydataLoanSchema>;
export type MonthlySummary = z.infer<typeof monthlySummarySchema>;
export type Transactions = z.infer<typeof transactionsSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
