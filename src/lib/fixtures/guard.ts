import { redirect } from "next/navigation";

import { isKnownPersona, normalizePersonaParam } from "./loader";

export function requirePersonaId(raw: string | string[] | undefined): string {
  const personaId = normalizePersonaParam(raw);

  if (!isKnownPersona(personaId)) {
    redirect("/personas");
  }

  return personaId;
}
