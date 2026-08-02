import type { PortfolioResult } from "@/lib/contracts/result";
import { categoryLabel } from "@/lib/format/codes";

import { AllocationTable } from "./allocation-table";
import { PortfolioCaveats } from "./portfolio-caveats";
import { PortfolioStatusNotice } from "./portfolio-status-notice";
import { PortfolioSummary } from "./portfolio-summary";

export function PortfolioView({ result }: { result: PortfolioResult }) {
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

      {result.status === "COMPLETE" || result.status === "PARTIAL" ? (
        <>
          <PortfolioSummary result={result} />
          <AllocationTable allocations={result.allocations} />
          <PortfolioCaveats result={result} />
        </>
      ) : (
        <PortfolioStatusNotice result={result} />
      )}
    </section>
  );
}
