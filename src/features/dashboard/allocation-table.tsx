"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Allocation } from "@/lib/contracts/result";
import { formatIsoDate } from "@/lib/format/date";
import { formatKoreanUnit, formatScore, toNumber } from "@/lib/format/money";
import { CHART_SURFACE, seriesColor } from "@/lib/theme/chart-colors";

export function AllocationTable({
  allocations,
}: {
  allocations: Allocation[];
}) {
  const chartData = allocations.map((allocation) => ({
    name: allocation.product_name,
    value: toNumber(allocation.expected_maturity_amount),
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              paddingAngle={2}
              stroke={CHART_SURFACE}
              strokeWidth={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={entry.name} fill={seriesColor(index)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) =>
                typeof value === "number" || typeof value === "string"
                  ? formatKoreanUnit(value)
                  : value
              }
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <Table aria-label="예적금 배분 결과">
          <TableHeader>
            <TableRow>
              <TableHead>상품명</TableHead>
              <TableHead className="text-right">배분액</TableHead>
              <TableHead className="text-right">기간</TableHead>
              <TableHead>만기일</TableHead>
              <TableHead className="text-right">만기 수령액</TableHead>
              <TableHead className="text-right">세후 이자</TableHead>
              <TableHead className="text-right">점수</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.map((allocation) => (
              <TableRow key={allocation.product_name}>
                <TableCell className="font-semibold">
                  {allocation.product_name}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatKoreanUnit(allocation.allocation_amount)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {allocation.term_months}개월
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatIsoDate(allocation.maturity_date)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatKoreanUnit(allocation.expected_maturity_amount)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatKoreanUnit(allocation.expected_net_interest)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatScore(allocation.product_score)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
