const ACCOUNT_TYPE_LABELS = {
  "1001": "수시입출금",
  "1002": "정기예금",
  "1003": "적금",
  "3150": "학자금대출",
};

const SAVING_METHOD_LABELS = {
  "01": "자유입출금",
  "02": "거치식",
  "03": "정액적립식",
  "04": "자유적립식",
};

const REPAY_METHOD_LABELS = {
  "01": "만기일시상환",
  "02": "원금균등분할상환",
  "03": "거치식-원금균등",
  "04": "원리금균등분할상환",
  "05": "거치식-원리금균등",
  "06": "만기지정-원금균등",
  "07": "만기지정-원리금균등",
  "08": "한도거래",
  "09": "기타(직접산정)",
};

const TRANS_TYPE_LABELS = {
  "01": "신규",
  "02": "출금",
  "03": "입금",
  "98": "기타(입금)",
};

export function maskAccountNum(accountNum) {
  if (typeof accountNum !== "string" || accountNum.length < 8) {
    throw new Error(`계좌번호가 너무 짧습니다: ${accountNum}`);
  }

  return `${accountNum.slice(0, 4)}-**-**${accountNum.slice(-4)}`;
}

export function accountKind(accountType) {
  if (accountType === "1001") return "demand";
  if (accountType === "1002" || accountType === "1003") return "savings";
  if (accountType.startsWith("3")) return "loan";

  throw new Error(`지원하지 않는 계좌 유형: ${accountType}`);
}

export function accountTypeLabel(accountType) {
  const label = ACCOUNT_TYPE_LABELS[accountType];

  if (!label) {
    throw new Error(`지원하지 않는 계좌 유형: ${accountType}`);
  }

  return label;
}

export function savingMethodLabel(code) {
  const label = SAVING_METHOD_LABELS[code];

  if (!label) {
    throw new Error(`지원하지 않는 적립 방식: ${code}`);
  }

  return label;
}

export function repayMethodLabel(code) {
  const label = REPAY_METHOD_LABELS[code];

  if (!label) {
    throw new Error(`지원하지 않는 상환 방식: ${code}`);
  }

  return label;
}

export function transTypeLabel(code) {
  const label = TRANS_TYPE_LABELS[code];

  if (!label) {
    throw new Error(`지원하지 않는 거래 구분: ${code}`);
  }

  return label;
}

export function buildMonthlySummary(transList) {
  const byMonth = new Map();

  for (const trans of transList) {
    const ym = trans.trans_dtime.slice(0, 6);

    if (!byMonth.has(ym)) {
      byMonth.set(ym, { ym, income: 0, expense: 0, interest: 0, net: 0 });
    }

    const row = byMonth.get(ym);

    if (trans.trans_type === "03") row.income += trans.trans_amt;
    else if (trans.trans_type === "02") row.expense += trans.trans_amt;
    else if (trans.trans_type === "98") row.interest += trans.trans_amt;
  }

  return [...byMonth.values()]
    .map((row) => ({ ...row, net: row.income - row.expense }))
    .sort((a, b) => a.ym.localeCompare(b.ym));
}

export function categoryOf(personaId) {
  for (const category of ["basic", "affluent", "poor"]) {
    if (personaId.endsWith(`_${category}`)) return category;
  }

  throw new Error(`카테고리를 알 수 없는 페르소나: ${personaId}`);
}
