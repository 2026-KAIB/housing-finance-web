function assertYm(ym: string): void {
  if (!/^\d{6}$/.test(ym)) {
    throw new Error(`YYYYMM 형식이 아닙니다: ${ym}`);
  }
}

export function formatYm(ym: string): string {
  assertYm(ym);
  return `${ym.slice(0, 4)}년 ${Number(ym.slice(4, 6))}월`;
}

export function formatYmShort(ym: string): string {
  assertYm(ym);
  return `${ym.slice(2, 4)}.${ym.slice(4, 6)}`;
}

export function formatYmd(ymd: string): string {
  if (!/^\d{8}$/.test(ymd)) {
    throw new Error(`YYYYMMDD 형식이 아닙니다: ${ymd}`);
  }

  return `${ymd.slice(0, 4)}.${ymd.slice(4, 6)}.${ymd.slice(6, 8)}`;
}

export function formatIsoDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`YYYY-MM-DD 형식이 아닙니다: ${value}`);
  }

  return value.replaceAll("-", ".");
}
