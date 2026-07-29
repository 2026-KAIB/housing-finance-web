import type { PortfolioResult } from "@/lib/contracts/result";
import { categoryLabel } from "@/lib/format/codes";

import { AllocationTable } from "./allocation-table";
import { PortfolioStatusNotice } from "./portfolio-status-notice";
import { PortfolioSummary } from "./portfolio-summary";

export function PortfolioView({
  result,
  edited,
}: {
  result: PortfolioResult;
  edited: boolean;
}) {
  return (
    <section className="grid gap-6 py-12">
      <div>
        <p className="m-0 font-bold text-accent">
          {result.display_name} · {categoryLabel(result.category)}
        </p>
        <h1 className="text-3xl font-bold tracking-[-0.04em]">
          예적금 포트폴리오
        </h1>
      </div>

      {edited && (
        <p className="rounded-xl border border-line bg-accent-soft p-4 text-sm">
          변경한 목표값은 백엔드 시뮬레이션 연동 후 반영됩니다. 현재 결과는
          페르소나 기준값 기준입니다.
        </p>
      )}

      {result.status === "COMPLETE" ? (
        <>
          <PortfolioSummary result={result} />
          <AllocationTable allocations={result.allocations} />
        </>
      ) : (
        <PortfolioStatusNotice result={result} />
      )}
    </section>
  );
}
