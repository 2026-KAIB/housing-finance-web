// Leaf module: no imports. `loader.ts` pulls in a static fixtures index
// import plus dynamic `import()`s over every per-persona fixture file, so
// anything importing from it (even for one unrelated helper) drags all of
// that into whatever bundle it lands in. Client components that only need
// a URL string must import from here instead of from loader.ts.
export function transactionsUrl(personaId: string): string {
  return `/fixtures/${personaId}/transactions.json`;
}
