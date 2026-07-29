import { InputWizard } from "@/features/input/input-wizard";
import { requirePersonaId } from "@/lib/fixtures/guard";
import { loadMydata, loadProfile } from "@/lib/fixtures/loader";

export default async function InputPage({
  searchParams,
}: {
  searchParams: Promise<{ persona?: string | string[] }>;
}) {
  const personaId = requirePersonaId((await searchParams).persona);
  const [profile, mydata] = await Promise.all([
    loadProfile(personaId),
    loadMydata(personaId),
  ]);

  return (
    <main>
      <InputWizard personaId={personaId} profile={profile} mydata={mydata} />
    </main>
  );
}
