import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  accountKind,
  accountTypeLabel,
  buildMonthlySummary,
  categoryOf,
  maskAccountNum,
  repayMethodLabel,
  savingMethodLabel,
  transTypeLabel,
} from "./lib/transform.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MYDATA_DIR = resolve(
  ROOT,
  process.env.MYDATA_DIR ?? "../housing-finance-core/app/data_pipeline/mydata",
);
const FIXTURE_DIR = join(ROOT, "src/mocks/fixtures");
const PUBLIC_DIR = join(ROOT, "public/fixtures");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function isoDate(ymd) {
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

function optional(key, value) {
  return value === undefined ? {} : { [key]: value };
}

function buildAccountsAndLoans(dir, accountList) {
  const accounts = [];
  const loans = [];
  const transactions = {};

  for (const account of accountList) {
    const kind = accountKind(account.account_type);
    const masked = maskAccountNum(account.account_num);

    if (kind === "loan") {
      const basic = readJson(
        join(dir, `bank_008_loan_basic_${account.account_num}.json`),
      );
      const detail = readJson(
        join(dir, `bank_009_loan_detail_${account.account_num}.json`),
      );

      loans.push({
        account_num_masked: masked,
        prod_name: account.prod_name,
        account_type: account.account_type,
        account_type_label: accountTypeLabel(account.account_type),
        balance_amt: detail.balance_amt,
        loan_principal: detail.loan_principal,
        last_offered_rate: basic.last_offered_rate,
        repay_method: basic.repay_method,
        repay_method_label: repayMethodLabel(basic.repay_method),
        issue_date: basic.issue_date,
        exp_date: basic.exp_date,
        next_repay_date: detail.next_repay_date,
      });
      continue;
    }

    const basic = readJson(
      join(dir, `bank_002_deposit_basic_${account.account_num}.json`),
    ).basic_list[0];
    const detail = readJson(
      join(dir, `bank_003_deposit_detail_${account.account_num}.json`),
    ).detail_list[0];

    const transPath = join(
      dir,
      `bank_004_deposit_trans_${account.account_num}.json`,
    );
    const hasTransactions = existsSync(transPath);

    if (hasTransactions) {
      transactions[masked] = {
        trans_list: readJson(transPath).trans_list.map((trans) => ({
          trans_dtime: trans.trans_dtime,
          trans_no: trans.trans_no,
          trans_type: trans.trans_type,
          trans_type_label: transTypeLabel(trans.trans_type),
          trans_class: trans.trans_class,
          trans_amt: trans.trans_amt,
          balance_amt: trans.balance_amt,
          trans_memo: trans.trans_memo,
        })),
      };
    }

    accounts.push({
      account_num_masked: masked,
      prod_name: account.prod_name,
      account_type: account.account_type,
      account_type_label: accountTypeLabel(account.account_type),
      account_kind: kind,
      saving_method: basic.saving_method,
      saving_method_label: savingMethodLabel(basic.saving_method),
      balance_amt: detail.balance_amt,
      withdrawable_amt: detail.withdrawable_amt,
      offered_rate: detail.offered_rate,
      issue_date: basic.issue_date,
      ...optional("exp_date", basic.exp_date),
      ...optional("commit_amt", basic.commit_amt),
      ...optional("monthly_paid_in_amt", basic.monthly_paid_in_amt),
      ...optional("last_paid_in_cnt", detail.last_paid_in_cnt),
      has_transactions: hasTransactions,
    });
  }

  return { accounts, loans, transactions };
}

function main() {
  const results = readJson(
    join(MYDATA_DIR, "college_student_portfolio_results.json"),
  );
  const resultSource = {
    generator: "college_student_portfolio_results.json",
    as_of: results.test_metadata.as_of,
  };

  rmSync(FIXTURE_DIR, { recursive: true, force: true });
  rmSync(PUBLIC_DIR, { recursive: true, force: true });

  const indexEntries = [];
  let mydataAsOf = null;

  for (const entry of results.personas) {
    const personaId = entry.persona_id;
    const dir = join(MYDATA_DIR, personaId);

    if (entry.persona_category !== categoryOf(personaId)) {
      throw new Error(
        `카테고리 불일치: ${personaId} — 결과는 ${entry.persona_category}, id는 ${categoryOf(personaId)}`,
      );
    }

    const userProfile = readJson(join(dir, "user_profile.json"));
    const preferences = readJson(join(dir, "savings_preferences.json"));
    const accountsFile = readJson(join(dir, "bank_001_accounts.json"));

    const asOf = accountsFile.search_timestamp.slice(0, 8);
    mydataAsOf = asOf;
    const mydataSource = { generator: "generate_all.py", as_of: isoDate(asOf) };

    const { accounts, loans, transactions } = buildAccountsAndLoans(
      dir,
      accountsFile.account_list,
    );

    const allTrans = Object.values(transactions).flatMap((a) => a.trans_list);

    writeJson(join(FIXTURE_DIR, personaId, "profile.json"), {
      persona_id: personaId,
      display_name: entry.persona_name,
      category: entry.persona_category,
      basic: {
        birth_date: userProfile.birth_date,
        age: userProfile.age_as_of,
        education_status: userProfile.education_status,
        military_service_status: userProfile.military_service_status,
        employment_type: userProfile.employment_type,
        marital_status: userProfile.marital_status,
        household_size: userProfile.household_size,
        lives_with_parents: userProfile.lives_with_parents,
        tuition_payer: userProfile.tuition_payer,
        current_housing_type: userProfile.current_housing_type,
      },
      goal: {
        target_housing_type: userProfile.target_housing_type,
        target_region: userProfile.target_region,
        target_price: userProfile.target_price,
        target_move_in_ym: userProfile.target_move_in_ym,
        risk_preference: userProfile.risk_preference,
      },
      finance: {
        annual_income_verified: userProfile.annual_income_verified,
        monthly_income: userProfile.monthly_income,
        monthly_average_expense: userProfile.monthly_average_expense,
        ...optional("current_assets", userProfile.current_assets),
        ...optional("monthly_debt_payment", userProfile.monthly_debt_payment),
      },
      savings: {
        fund_needed_date: preferences.fund_needed_date,
        monthly_savings_budget: preferences.monthly_savings_budget,
        lump_sum_budget: preferences.lump_sum_budget,
        emergency_reserve: preferences.emergency_reserve,
        liquidity_preference: preferences.liquidity_preference,
        accepts_principal_risk: preferences.accepts_principal_risk,
        maximum_recommended_products: preferences.maximum_recommended_products,
      },
      source: mydataSource,
    });

    writeJson(join(FIXTURE_DIR, personaId, "mydata.json"), {
      persona_id: personaId,
      as_of: asOf,
      accounts,
      loans,
      monthly_summary: buildMonthlySummary(allTrans),
      totals: {
        account_count: accounts.length,
        loan_count: loans.length,
        total_balance: accounts.reduce((sum, a) => sum + a.balance_amt, 0),
        total_loan_balance: loans.reduce((sum, l) => sum + l.balance_amt, 0),
      },
      derived_by: "fixture-script",
      source: mydataSource,
    });

    const portfolio = entry.portfolio;

    writeJson(join(FIXTURE_DIR, personaId, "result.json"), {
      persona_id: personaId,
      display_name: entry.persona_name,
      category: entry.persona_category,
      status: portfolio.status,
      success: portfolio.success,
      coverage_ratio: portfolio.coverage_ratio,
      monthly_allocated: portfolio.monthly_allocated,
      monthly_unallocated: portfolio.monthly_unallocated,
      lump_sum_allocated: portfolio.lump_sum_allocated,
      lump_sum_unallocated: portfolio.lump_sum_unallocated,
      expected_total_principal: portfolio.expected_total_principal,
      expected_maturity_amount: portfolio.expected_maturity_amount,
      expected_net_interest: portfolio.expected_net_interest,
      final_policy_status: portfolio.final_policy_status,
      final_policy_valid: portfolio.final_policy_valid,
      reasons: portfolio.reasons,
      validation_reasons: portfolio.validation_reasons,
      allocations: portfolio.allocations,
      input: {
        age: entry.input.age,
        monthly_income: entry.input.monthly_income,
        monthly_expense: entry.input.monthly_expense,
        current_assets: entry.input.current_assets,
        monthly_savings_budget: entry.input.monthly_savings_budget,
        lump_sum_budget: entry.input.lump_sum_budget,
        fund_needed_date: entry.input.fund_needed_date,
      },
      evaluation: entry.evaluation,
      source: resultSource,
    });

    writeJson(join(PUBLIC_DIR, personaId, "transactions.json"), {
      persona_id: personaId,
      accounts: transactions,
      source: mydataSource,
    });

    indexEntries.push({
      persona_id: personaId,
      display_name: entry.persona_name,
      category: entry.persona_category,
      headline: {
        age: entry.input.age,
        monthly_income: entry.input.monthly_income,
        monthly_expense: entry.input.monthly_expense,
        target_price: userProfile.target_price,
        target_move_in_ym: userProfile.target_move_in_ym,
      },
      portfolio_status: portfolio.status,
    });
  }

  writeJson(join(FIXTURE_DIR, "index.json"), {
    as_of: mydataAsOf,
    personas: indexEntries,
  });

  console.log(`픽스처 ${indexEntries.length}명 생성 완료`);
  console.log(`  ${FIXTURE_DIR}`);
  console.log(`  ${PUBLIC_DIR}`);
}

main();
