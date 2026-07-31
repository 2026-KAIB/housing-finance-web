export function toNumber(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`숫자로 변환할 수 없는 값: ${value}`);
  }

  return parsed;
}

export function formatWon(value: string | number): string {
  return `${Math.round(toNumber(value)).toLocaleString("ko-KR")}원`;
}

export function formatKoreanUnit(value: string | number): string {
  const rounded = Math.round(toNumber(value));
  const sign = rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded);

  const eok = Math.floor(abs / 100_000_000);
  const man = Math.floor((abs % 100_000_000) / 10_000);
  const won = abs % 10_000;

  const parts: string[] = [];
  if (eok > 0) parts.push(`${eok.toLocaleString("ko-KR")}억`);
  if (man > 0) parts.push(`${man.toLocaleString("ko-KR")}만`);
  if (won > 0) parts.push(won.toLocaleString("ko-KR"));

  if (parts.length === 0) {
    return "0원";
  }

  return `${sign}${parts.join(" ")}원`;
}

/**
 * 입력 중인 폼 값을 힌트로 보여줄 때 쓴다. formatKoreanUnit과 달리 던지지 않고
 * undefined를 돌려주며, FieldRow는 undefined를 받으면 힌트를 그리지 않는다.
 *
 * 던지지 않는 것이 핵심이다 — 힌트가 라이브 입력에 붙어 있으므로, 사용자가
 * 필드를 비우거나 숫자로 볼 수 없는 값을 남긴 순간 렌더 도중 예외가 나면
 * 화면 전체가 죽는다.
 */
export function koreanUnitHint(value: unknown): string | undefined {
  if (value === "" || value === undefined || value === null) return undefined;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;

  return formatKoreanUnit(parsed);
}

export function formatRate(value: number): string {
  const percent = Math.round(value * 10_000) / 100;
  return `연 ${percent}%`;
}

export function formatScore(value: string | number): string {
  return (Math.round(toNumber(value) * 100) / 100).toFixed(2);
}
