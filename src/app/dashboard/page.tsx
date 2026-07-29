import { PortfolioView } from "@/features/dashboard/portfolio-view";
import { requirePersonaId } from "@/lib/fixtures/guard";
import { loadResult } from "@/lib/fixtures/loader";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ persona?: string | string[]; edited?: string }>;
}) {
  const params = await searchParams;
  const personaId = requirePersonaId(params.persona);
  const result = await loadResult(personaId);

  return (
    <main>
      <PortfolioView result={result} edited={params.edited === "1"} />
    </main>
  );
}
