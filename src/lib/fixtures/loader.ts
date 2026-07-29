import {
  type Mydata,
  type PersonaIndex,
  type PersonaProfile,
  mydataSchema,
  personaIndexSchema,
  personaProfileSchema,
} from "@/lib/contracts/persona";
import { type PortfolioResult, portfolioResultSchema } from "@/lib/contracts/result";
import rawIndex from "@/mocks/fixtures/index.json";

let cachedIndex: PersonaIndex | null = null;

export function loadPersonaIndex(): PersonaIndex {
  cachedIndex ??= personaIndexSchema.parse(rawIndex);
  return cachedIndex;
}

export function isKnownPersona(
  personaId: string | undefined,
): personaId is string {
  if (!personaId) return false;

  return loadPersonaIndex().personas.some(
    (persona) => persona.persona_id === personaId,
  );
}

export function normalizePersonaParam(
  raw: string | string[] | undefined,
): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

function assertKnown(personaId: string): void {
  if (!isKnownPersona(personaId)) {
    throw new Error(`알 수 없는 페르소나: ${personaId}`);
  }
}

export async function loadProfile(personaId: string): Promise<PersonaProfile> {
  assertKnown(personaId);
  const mod = await import(`../../mocks/fixtures/${personaId}/profile.json`);
  return personaProfileSchema.parse(mod.default);
}

export async function loadMydata(personaId: string): Promise<Mydata> {
  assertKnown(personaId);
  const mod = await import(`../../mocks/fixtures/${personaId}/mydata.json`);
  return mydataSchema.parse(mod.default);
}

export async function loadResult(personaId: string): Promise<PortfolioResult> {
  assertKnown(personaId);
  const mod = await import(`../../mocks/fixtures/${personaId}/result.json`);
  return portfolioResultSchema.parse(mod.default);
}

export function transactionsUrl(personaId: string): string {
  return `/fixtures/${personaId}/transactions.json`;
}
