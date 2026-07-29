import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortfolioResult } from "@/lib/contracts/result";
import { formatKoreanUnit, toNumber } from "@/lib/format/money";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

export function PortfolioSummary({ result }: { result: PortfolioResult }) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {result.final_policy_status === "PASS" && (
          <Badge variant="outline">정책 통과</Badge>
        )}
        <Badge variant="outline">기준일 {result.source.as_of}</Badge>
        <Badge variant="outline">
          목표 달성률 {Math.round(toNumber(result.coverage_ratio) * 100)}%
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="월 배분액"
          value={formatKoreanUnit(result.monthly_allocated)}
        />
        <Metric
          label="일시 예치액"
          value={formatKoreanUnit(result.lump_sum_allocated)}
        />
        <Metric
          label="만기 예상 수령액"
          value={formatKoreanUnit(result.expected_maturity_amount)}
        />
        <Metric
          label="예상 세후 이자"
          value={formatKoreanUnit(result.expected_net_interest)}
        />
      </div>
    </div>
  );
}
