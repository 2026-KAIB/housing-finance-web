"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Mydata } from "@/lib/contracts/persona";
import { formatYmd } from "@/lib/format/date";
import { formatWon } from "@/lib/format/money";

import { AccountList } from "./account-list";
import { LoanList } from "./loan-list";
import { MonthlyFlowChart } from "./monthly-flow-chart";
import { TransactionPanel } from "./transaction-panel";

/**
 * 불러온 상태는 호출자가 쥔다. 입력 위저드가 step 3(입력 확인)에서 연동 여부를
 * 보고해야 하므로 이 컴포넌트 안에 상태를 두면 그 사실을 알 수 없다.
 */
export function MydataPanel({
  personaId,
  mydata,
  loaded,
  onLoad,
}: {
  personaId: string;
  mydata: Mydata;
  loaded: boolean;
  onLoad: () => void;
}) {
  const demand = mydata.accounts.filter(
    (account) => account.account_kind === "demand",
  );
  const savings = mydata.accounts.filter(
    (account) => account.account_kind === "savings",
  );

  if (!loaded) {
    return (
      <div className="grid gap-3 rounded-xl border border-line bg-surface p-8">
        <h2 className="text-xl font-bold">마이데이터 불러오기</h2>
        <p className="text-brand-muted">
          동의한 금융기관의 계좌·예적금·대출·거래내역을 조회합니다.
        </p>
        <div>
          <Button type="button" onClick={onLoad}>
            마이데이터 불러오기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-bold">마이데이터</h2>
        <Badge variant="outline">기준일 {formatYmd(mydata.as_of)}</Badge>
        <Badge variant="outline">
          총 잔액 {formatWon(mydata.totals.total_balance)}
        </Badge>
        {mydata.totals.total_loan_balance > 0 && (
          <Badge variant="outline">
            대출 잔액 {formatWon(mydata.totals.total_loan_balance)}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="demand">
        <TabsList>
          <TabsTrigger value="demand">계좌 {demand.length}</TabsTrigger>
          <TabsTrigger value="savings">예적금 {savings.length}</TabsTrigger>
          <TabsTrigger value="loans">대출 {mydata.loans.length}</TabsTrigger>
          <TabsTrigger value="transactions">거래내역</TabsTrigger>
        </TabsList>

        <TabsContent value="demand">
          <AccountList accounts={demand} />
        </TabsContent>
        <TabsContent value="savings">
          <AccountList accounts={savings} />
        </TabsContent>
        <TabsContent value="loans">
          <LoanList loans={mydata.loans} />
        </TabsContent>
        <TabsContent value="transactions">
          <div className="grid gap-8">
            <MonthlyFlowChart rows={mydata.monthly_summary} />
            <TransactionPanel personaId={personaId} accounts={mydata.accounts} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
