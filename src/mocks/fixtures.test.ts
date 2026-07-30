import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  mydataSchema,
  personaIndexSchema,
  personaProfileSchema,
  transactionsSchema,
} from "@/lib/contracts/persona";
import { portfolioResultSchema } from "@/lib/contracts/result";

const FIXTURE_DIR = join(process.cwd(), "src/mocks/fixtures");
const PUBLIC_DIR = join(process.cwd(), "public/fixtures");

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

const index = personaIndexSchema.parse(readJson(join(FIXTURE_DIR, "index.json")));

describe("픽스처 목록", () => {
  it("대학생 20명이 있다", () => {
    expect(index.personas).toHaveLength(20);
  });

  it("주택구매 페르소나(a~d)는 들어있지 않다", () => {
    const ids = index.personas.map((p) => p.persona_id);
    expect(ids.some((id) => /^persona_[abcd]_/.test(id))).toBe(false);
  });

  it("포트폴리오 상태 분포가 실제 엔진 결과와 같다", () => {
    const counts = index.personas.reduce<Record<string, number>>(
      (acc, persona) => {
        acc[persona.portfolio_status] = (acc[persona.portfolio_status] ?? 0) + 1;
        return acc;
      },
      {},
    );

    expect(counts).toEqual({
      COMPLETE: 14,
      INFEASIBLE: 3,
      NO_ALLOCATION_REQUIRED: 3,
    });
  });

  it("디렉터리 개수와 목록 개수가 일치한다", () => {
    const dirs = readdirSync(FIXTURE_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    expect(dirs.sort()).toEqual(index.personas.map((p) => p.persona_id).sort());
  });
});

describe.each(index.personas.map((persona) => persona.persona_id))(
  "%s",
  (personaId) => {
    const dir = join(FIXTURE_DIR, personaId);

    it("profile.json이 계약을 지킨다", () => {
      expect(() =>
        personaProfileSchema.parse(readJson(join(dir, "profile.json"))),
      ).not.toThrow();
    });

    it("mydata.json이 계약을 지키고 잔액 합계가 맞는다", () => {
      const mydata = mydataSchema.parse(readJson(join(dir, "mydata.json")));
      const sum = mydata.accounts.reduce((acc, a) => acc + a.balance_amt, 0);

      expect(mydata.totals.total_balance).toBe(sum);
      expect(mydata.totals.total_loan_balance).toBe(
        mydata.loans.reduce((acc, loan) => acc + loan.balance_amt, 0),
      );
      expect(mydata.totals.account_count).toBe(mydata.accounts.length);
      expect(mydata.totals.loan_count).toBe(mydata.loans.length);
    });

    it("result.json이 계약을 지킨다", () => {
      expect(() =>
        portfolioResultSchema.parse(readJson(join(dir, "result.json"))),
      ).not.toThrow();
    });

    it("transactions.json이 public에 있고 계약을 지킨다", () => {
      const path = join(PUBLIC_DIR, personaId, "transactions.json");
      expect(existsSync(path)).toBe(true);
      expect(() => transactionsSchema.parse(readJson(path))).not.toThrow();
    });

    it("원본 계좌번호가 남아있지 않다", () => {
      const raw = [
        readFileSync(join(dir, "mydata.json"), "utf8"),
        readFileSync(join(PUBLIC_DIR, personaId, "transactions.json"), "utf8"),
      ].join("");

      expect(raw).not.toContain('"account_num"');
    });
  },
);
