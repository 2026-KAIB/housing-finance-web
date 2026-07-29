import { redirect } from "next/navigation";

import { isKnownPersona } from "./loader";

export function requirePersonaId(raw: string | string[] | undefined): string {
  const personaId = Array.isArray(raw) ? raw[0] : raw;

  if (!isKnownPersona(personaId)) {
    redirect("/personas");
  }

  return personaId;
}
