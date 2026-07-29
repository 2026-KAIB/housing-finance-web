import type { PortfolioResult } from "@/lib/contracts/result";
import { formatKoreanUnit, toNumber } from "@/lib/format/money";

// `reasons`, `validation_reasons`, `monthly_unallocated`, and
// `lump_sum_unallocated` are parsed by the contract on every result,
// regardless of status. Today's 14 COMPLETE fixtures leave all four
// empty/zero, so this renders nothing on the success path — but a live
// engine can return COMPLETE with a caveat attached (e.g. a product
// excluded on re-validation, or part of the budget left unallocated), and
// the user must still see it. Kept visually subordinate to the headline
// figures: small text, muted color, no card of its own.
export function PortfolioCaveats({ result }: { result: PortfolioResult }) {
  const monthlyUnallocated = toNumber(result.monthly_unallocated);
  const lumpSumUnallocated = toNumber(result.lump_sum_unallocated);

  const notes = [...result.reasons, ...result.validation_reasons];
  const hasUnallocated = monthlyUnallocated > 0 || lumpSumUnallocated > 0;

  if (notes.length === 0 && !hasUnallocated) {
    return null;
  }

  return (
    <div className="grid gap-1 text-sm text-brand-muted">
      {notes.map((note) => (
        <p className="m-0" key={note}>
          {note}
        </p>
      ))}
      {monthlyUnallocated > 0 && (
        <p className="m-0">
          월 미배분액 {formatKoreanUnit(result.monthly_unallocated)}
        </p>
      )}
      {lumpSumUnallocated > 0 && (
        <p className="m-0">
          일시 미배분액 {formatKoreanUnit(result.lump_sum_unallocated)}
        </p>
      )}
    </div>
  );
}
