import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MydataAccount } from "@/lib/contracts/persona";
import { formatYmd } from "@/lib/format/date";
import { formatRate, formatWon } from "@/lib/format/money";

export function AccountList({ accounts }: { accounts: MydataAccount[] }) {
  if (accounts.length === 0) {
    return <p className="py-6 text-muted">해당하는 계좌가 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>상품명</TableHead>
            <TableHead>계좌번호</TableHead>
            <TableHead>유형</TableHead>
            <TableHead className="text-right">잔액</TableHead>
            <TableHead className="text-right">금리</TableHead>
            <TableHead>개설일</TableHead>
            <TableHead>만기일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <TableRow key={account.account_num_masked}>
              <TableCell className="font-semibold">
                {account.prod_name}
              </TableCell>
              <TableCell className="tabular-nums">
                {account.account_num_masked}
              </TableCell>
              <TableCell>{account.account_type_label}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatWon(account.balance_amt)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatRate(account.offered_rate)}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatYmd(account.issue_date)}
              </TableCell>
              <TableCell className="tabular-nums">
                {account.exp_date ? formatYmd(account.exp_date) : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
