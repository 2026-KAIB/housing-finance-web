import { PersonaGrid } from "@/features/personas/persona-grid";
import { loadPersonaIndex } from "@/lib/fixtures/loader";

export default function PersonasPage() {
  const index = loadPersonaIndex();

  return (
    <main>
      <PersonaGrid personas={index.personas} />
    </main>
  );
}
