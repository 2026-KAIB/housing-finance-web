import { z } from "zod";

import {
  personaCategorySchema,
  portfolioStatusSchema,
  sourceSchema,
} from "./persona";

export const allocationSchema = z.object({
  product_name: z.string(),
  product_kind: z.string(),
  allocation_amount: z.string(),
  term_months: z.number().int(),
  maturity_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expected_maturity_amount: z.string(),
  expected_net_interest: z.string(),
  product_score: z.string(),
});

export const portfolioResultSchema = z.object({
  persona_id: z.string().min(1),
  display_name: z.string().min(1),
  category: personaCategorySchema,
  status: portfolioStatusSchema,
  success: z.boolean(),
  coverage_ratio: z.string(),
  monthly_allocated: z.string(),
  monthly_unallocated: z.string(),
  lump_sum_allocated: z.string(),
  lump_sum_unallocated: z.string(),
  expected_total_principal: z.string(),
  expected_maturity_amount: z.string(),
  expected_net_interest: z.string(),
  final_policy_status: z.enum(["PASS", "FAIL", "UNKNOWN"]),
  final_policy_valid: z.boolean(),
  reasons: z.array(z.string()),
  validation_reasons: z.array(z.string()),
  allocations: z.array(allocationSchema),
  input: z.object({
    age: z.number().int(),
    monthly_income: z.number(),
    monthly_expense: z.number(),
    current_assets: z.number(),
    monthly_savings_budget: z.number(),
    lump_sum_budget: z.number(),
    fund_needed_date: z.string().regex(/^\d{8}$/),
  }),
  // ELIGIBLE/INELIGIBLE 집계는 배치 파이프라인이 만드는 값이라 실시간
  // SimulationResult에는 없다. 0으로 채우면 "검토한 상품 0건"이라는 거짓이
  // 되므로 없는 상태로 둔다.
  evaluation: z
    .object({
      ELIGIBLE: z.number().int(),
      INELIGIBLE: z.number().int(),
    })
    .optional(),
  source: sourceSchema,
});

export type Allocation = z.infer<typeof allocationSchema>;
export type PortfolioResult = z.infer<typeof portfolioResultSchema>;
