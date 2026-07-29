"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MonthlySummary } from "@/lib/contracts/persona";
import { formatYm, formatYmShort } from "@/lib/format/date";
import { formatWon } from "@/lib/format/money";

export type ChartRow = {
  label: string;
  income: number;
  expense: number;
  net: number;
};

export function toChartRows(rows: MonthlySummary[]): ChartRow[] {
  return rows.map((row) => ({
    label: formatYmShort(row.ym),
    income: row.income,
    expense: row.expense,
    net: row.net,
  }));
}

export function MonthlyFlowChart({ rows }: { rows: MonthlySummary[] }) {
  if (rows.length === 0) {
    return <p className="py-6 text-muted">집계할 거래내역이 없습니다.</p>;
  }

  return (
    <div className="grid gap-4">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={toChartRows(rows)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dce4de" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value: number) => `${Math.round(value / 10000)}만`}
            />
            <Tooltip
              formatter={(value) =>
                typeof value === "number" || typeof value === "string"
                  ? formatWon(value)
                  : value
              }
            />
            <Legend />
            <Bar dataKey="income" name="입금" fill="#256b46" />
            <Bar dataKey="expense" name="출금" fill="#b45309" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-muted">
        거래내역 단순 합계입니다. 안전소득·안전지출과는 다른 값이며 백엔드
        현금흐름 엔진이 계산합니다.
      </p>

      <div className="overflow-x-auto">
        <Table aria-label="월별 입출금 합계">
          <TableHeader>
            <TableRow>
              <TableHead>월</TableHead>
              <TableHead className="text-right">입금</TableHead>
              <TableHead className="text-right">출금</TableHead>
              <TableHead className="text-right">이자</TableHead>
              <TableHead className="text-right">순증감</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.ym}>
                <TableCell>{formatYm(row.ym)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatWon(row.income)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatWon(row.expense)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatWon(row.interest)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatWon(row.net)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
