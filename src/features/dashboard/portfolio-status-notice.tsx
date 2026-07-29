import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortfolioResult } from "@/lib/contracts/result";
import { formatKoreanUnit } from "@/lib/format/money";

const TITLES = {
  INFEASIBLE: "조건을 만족하는 배분 조합이 없습니다",
  NO_ALLOCATION_REQUIRED: "배분할 저축액이 없습니다",
} as const;

export function PortfolioStatusNotice({
  result,
}: {
  result: PortfolioResult;
}) {
  const title =
    result.status === "INFEASIBLE"
      ? TITLES.INFEASIBLE
      : TITLES.NO_ALLOCATION_REQUIRED;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ul className="grid gap-1">
          {result.reasons.map((reason) => (
            <li className="text-muted" key={reason}>
              {reason}
            </li>
          ))}
        </ul>

        <dl className="grid gap-2 border-t border-line pt-4 text-sm sm:grid-cols-2">
          <Row
            label="월 저축 예산"
            value={formatKoreanUnit(result.input.monthly_savings_budget)}
          />
          <Row
            label="일시 예치 예산"
            value={formatKoreanUnit(result.input.lump_sum_budget)}
          />
          <Row
            label="검토한 상품 조합"
            value={`${result.evaluation.ELIGIBLE + result.evaluation.INELIGIBLE}건`}
          />
          <Row label="자금 필요 시점" value={result.input.fund_needed_date} />
        </dl>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
