import { describe, expect, it } from "vitest";

import {
  accountKind,
  accountTypeLabel,
  buildMonthlySummary,
  categoryOf,
  maskAccountNum,
  repayMethodLabel,
  savingMethodLabel,
  transTypeLabel,
} from "./transform.mjs";

describe("maskAccountNum", () => {
  it("앞 4자리와 뒤 4자리만 남긴다", () => {
    expect(maskAccountNum("40100102000001")).toBe("4010-**-**0001");
    expect(maskAccountNum("41500102000004")).toBe("4150-**-**0004");
  });

  it("8자리 미만이면 던진다", () => {
    expect(() => maskAccountNum("1234567")).toThrow(
      "계좌번호가 너무 짧습니다: 1234567",
    );
  });
});

describe("accountKind", () => {
  it("수시입출금은 demand다", () => {
    expect(accountKind("1001")).toBe("demand");
  });

  it("정기예금과 적금은 savings다", () => {
    expect(accountKind("1002")).toBe("savings");
    expect(accountKind("1003")).toBe("savings");
  });

  it("3000번대는 loan이다", () => {
    expect(accountKind("3150")).toBe("loan");
    expect(accountKind("3100")).toBe("loan");
  });

  it("청약과 ISA는 1차 범위 밖이므로 던진다", () => {
    expect(() => accountKind("1999")).toThrow("지원하지 않는 계좌 유형: 1999");
    expect(() => accountKind("2003")).toThrow("지원하지 않는 계좌 유형: 2003");
  });
});

describe("accountTypeLabel", () => {
  it("코드를 한글 라벨로 바꾼다", () => {
    expect(accountTypeLabel("1001")).toBe("수시입출금");
    expect(accountTypeLabel("1002")).toBe("정기예금");
    expect(accountTypeLabel("1003")).toBe("적금");
    expect(accountTypeLabel("3150")).toBe("학자금대출");
  });

  it("모르는 코드는 던진다", () => {
    expect(() => accountTypeLabel("9999")).toThrow(
      "지원하지 않는 계좌 유형: 9999",
    );
  });
});

describe("savingMethodLabel / repayMethodLabel / transTypeLabel", () => {
  it("적립 방식 코드를 바꾼다", () => {
    expect(savingMethodLabel("01")).toBe("자유입출금");
    expect(savingMethodLabel("03")).toBe("정액적립식");
  });

  it("상환 방식 04는 원리금균등분할상환이다", () => {
    expect(repayMethodLabel("01")).toBe("만기일시상환");
    expect(repayMethodLabel("04")).toBe("원리금균등분할상환");
  });

  it("거래 구분 코드를 바꾼다", () => {
    expect(transTypeLabel("02")).toBe("출금");
    expect(transTypeLabel("03")).toBe("입금");
    expect(transTypeLabel("98")).toBe("기타(입금)");
  });
});

describe("buildMonthlySummary", () => {
  const transList = [
    { trans_dtime: "20260710120000", trans_type: "03", trans_amt: 800000 },
    { trans_dtime: "20260712120000", trans_type: "02", trans_amt: 500000 },
    { trans_dtime: "20260715120000", trans_type: "02", trans_amt: 200000 },
    { trans_dtime: "20260716120000", trans_type: "98", trans_amt: 3360 },
    { trans_dtime: "20260812120000", trans_type: "02", trans_amt: 700000 },
    { trans_dtime: "20260801120000", trans_type: "01", trans_amt: 999999 },
  ];

  it("월별로 입금·출금·이자를 나눠 합산한다", () => {
    expect(buildMonthlySummary(transList)[0]).toEqual({
      ym: "202607",
      income: 800000,
      expense: 700000,
      interest: 3360,
      net: 100000,
    });
  });

  it("소득이 없는 달도 income 0으로 남긴다", () => {
    expect(buildMonthlySummary(transList)[1]).toEqual({
      ym: "202608",
      income: 0,
      expense: 700000,
      interest: 0,
      net: -700000,
    });
  });

  it("신규(01)는 합계에서 제외한다", () => {
    const total = buildMonthlySummary(transList).reduce(
      (sum, row) => sum + row.income + row.expense + row.interest,
      0,
    );
    expect(total).toBe(800000 + 700000 + 3360 + 700000);
  });

  it("월 오름차순으로 정렬한다", () => {
    expect(buildMonthlySummary(transList).map((row) => row.ym)).toEqual([
      "202607",
      "202608",
    ]);
  });

  it("빈 거래는 빈 배열이다", () => {
    expect(buildMonthlySummary([])).toEqual([]);
  });
});

describe("categoryOf", () => {
  it("페르소나 id 접미사에서 카테고리를 뽑는다", () => {
    expect(categoryOf("persona_e_college_student_basic")).toBe("basic");
    expect(categoryOf("persona_l_college_student_08_affluent")).toBe("affluent");
    expect(categoryOf("persona_x_college_student_20_poor")).toBe("poor");
  });

  it("모르는 접미사는 던진다", () => {
    expect(() => categoryOf("persona_a_social_starter")).toThrow(
      "카테고리를 알 수 없는 페르소나: persona_a_social_starter",
    );
  });
});
