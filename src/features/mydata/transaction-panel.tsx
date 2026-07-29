"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type MydataAccount,
  type Transactions,
  transactionsSchema,
} from "@/lib/contracts/persona";
import { transactionsUrl } from "@/lib/fixtures/loader";
import { formatWon } from "@/lib/format/money";

const PAGE_SIZE = 50;

function formatTransDtime(value: string): string {
  return `${value.slice(0, 4)}.${value.slice(4, 6)}.${value.slice(6, 8)} ${value.slice(8, 10)}:${value.slice(10, 12)}`;
}

export function TransactionPanel({
  personaId,
  accounts,
}: {
  personaId: string;
  accounts: MydataAccount[];
}) {
  const withTransactions = accounts.filter(
    (account) => account.has_transactions,
  );
  const [data, setData] = useState<Transactions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    if (withTransactions.length === 0) return;

    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(transactionsUrl(personaId));
        if (!response.ok) throw new Error(String(response.status));
        const parsed = transactionsSchema.parse(await response.json());
        if (!cancelled) setData(parsed);
      } catch {
        if (!cancelled) setError("거래내역을 불러오지 못했습니다.");
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [personaId, withTransactions.length]);

  if (withTransactions.length === 0) {
    return <p className="py-6 text-muted">거래내역이 있는 계좌가 없습니다.</p>;
  }

  if (error) {
    return (
      <p className="py-6 font-semibold text-red-700" role="alert">
        {error}
      </p>
    );
  }

  if (!data) {
    return <p className="py-6 text-muted">거래내역을 불러오는 중입니다…</p>;
  }

  const rows = withTransactions.flatMap(
    (account) => data.accounts[account.account_num_masked]?.trans_list ?? [],
  );

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">
        전체 {rows.length.toLocaleString("ko-KR")}건 중 {Math.min(visible, rows.length)}건
      </p>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>거래일시</TableHead>
              <TableHead>구분</TableHead>
              <TableHead>수단</TableHead>
              <TableHead>적요</TableHead>
              <TableHead className="text-right">금액</TableHead>
              <TableHead className="text-right">잔액</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, visible).map((trans) => (
              <TableRow key={`${trans.trans_dtime}-${trans.trans_no}`}>
                <TableCell className="tabular-nums">
                  {formatTransDtime(trans.trans_dtime)}
                </TableCell>
                <TableCell>{trans.trans_type_label}</TableCell>
                <TableCell>{trans.trans_class}</TableCell>
                <TableCell>{trans.trans_memo}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatWon(trans.trans_amt)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatWon(trans.balance_amt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {visible < rows.length && (
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setVisible((current) => current + PAGE_SIZE)}
          >
            더 보기
          </Button>
        </div>
      )}
    </div>
  );
}
