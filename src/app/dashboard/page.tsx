import { LiveDashboard } from "@/features/dashboard/live-dashboard";
import { requirePersonaId } from "@/lib/fixtures/guard";
import { loadProfile } from "@/lib/fixtures/loader";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ persona?: string | string[] }>;
}) {
  const params = await searchParams;
  const personaId = requirePersonaId(params.persona);
  const profile = await loadProfile(personaId);

  return (
    <main>
      <LiveDashboard profile={profile} />
    </main>
  );
}
