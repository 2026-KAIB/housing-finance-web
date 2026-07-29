import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MydataLoan } from "@/lib/contracts/persona";
import { formatYmd } from "@/lib/format/date";
import { formatRate, formatWon } from "@/lib/format/money";

export function LoanList({ loans }: { loans: MydataLoan[] }) {
  if (loans.length === 0) {
    return <p className="py-6 text-muted">보유한 대출이 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>상품명</TableHead>
            <TableHead>계좌번호</TableHead>
            <TableHead className="text-right">잔액</TableHead>
            <TableHead className="text-right">최초 원금</TableHead>
            <TableHead className="text-right">금리</TableHead>
            <TableHead>상환방식</TableHead>
            <TableHead>만기일</TableHead>
            <TableHead>다음 상환일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loans.map((loan) => (
            <TableRow key={loan.account_num_masked}>
              <TableCell className="font-semibold">{loan.prod_name}</TableCell>
              <TableCell className="tabular-nums">
                {loan.account_num_masked}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatWon(loan.balance_amt)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatWon(loan.loan_principal)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatRate(loan.last_offered_rate)}
              </TableCell>
              <TableCell>{loan.repay_method_label}</TableCell>
              <TableCell className="tabular-nums">
                {formatYmd(loan.exp_date)}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatYmd(loan.next_repay_date)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
