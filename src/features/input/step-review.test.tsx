import { render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import type { Mydata, PersonaProfile } from "@/lib/contracts/persona";
import { loadMydata, loadProfile } from "@/lib/fixtures/loader";
import { formatWon } from "@/lib/format/money";

import { type InputFormValues, toFormValues } from "./form-schema";
import { StepReview } from "./step-review";

const SAMPLE = "persona_e_college_student_basic";
const WITH_LOAN = "persona_s_college_student_15_poor";

function Harness({
  profile,
  mydata,
  mydataLoaded,
  overrides,
}: {
  profile: PersonaProfile;
  mydata: Mydata;
  mydataLoaded: boolean;
  overrides?: Partial<InputFormValues>;
}) {
  const form = useForm<InputFormValues>({
    defaultValues: { ...toFormValues(profile), ...overrides },
  });

  return (
    <FormProvider {...form}>
      <StepReview
        profile={profile}
        mydata={mydata}
        mydataLoaded={mydataLoaded}
      />
    </FormProvider>
  );
}

async function renderReview({
  personaId = SAMPLE,
  mydataLoaded = false,
  overrides,
}: {
  personaId?: string;
  mydataLoaded?: boolean;
  overrides?: Partial<InputFormValues>;
} = {}) {
  const [profile, mydata] = await Promise.all([
    loadProfile(personaId),
    loadMydata(personaId),
  ]);

  render(
    <Harness
      profile={profile}
      mydata={mydata}
      mydataLoaded={mydataLoaded}
      // SAMPLE(persona_e)에는 보유 자산 정보가 없다. Task 3에서 current_assets가
      // 필수가 된 뒤로는 실제 마법사가 1단계에서 이 값을 입력받기 전에는 확인
      // 화면에 다다르지 못한다(input-wizard.test.tsx의 fillCurrentAssets와 같은
      // 이유). 여기서도 같은 이유로 기본값을 채워, 값을 직접 검증하지 않는
      // 테스트가 프로필에 없는 값 때문에 깨지지 않게 한다.
      overrides={{ current_assets: 8000000, ...overrides }}
    />,
  );
  return { profile, mydata };
}

/**
 * ReadonlyRow는 [라벨][값] 두 칸이다. 같은 문자열이 다른 행의 *값*으로도 나올 수
 * 있으므로(현재 거주 형태 = "부모님과 거주") 행의 첫 칸인 것만 라벨로 인정한다.
 */
function rowValue(label: string): string {
  for (const element of screen.getAllByText(label)) {
    if (element.parentElement?.firstElementChild === element) {
      return element.nextElementSibling?.textContent ?? "";
    }
  }

  throw new Error(`라벨 칸을 찾을 수 없습니다: ${label}`);
}

describe("StepReview", () => {
  it("폼에 들어 있는 입력값을 보여준다", async () => {
    await renderReview();

    expect(rowValue("나이")).toBe("만 25세");
    expect(rowValue("가구원수")).toBe("3명");
    expect(rowValue("월 소득")).toBe("800,000원");
    expect(rowValue("월 평균 지출")).toBe("700,000원");
    expect(rowValue("지역")).toBe("서초구");
    expect(rowValue("목표 가격")).toBe("325,000,000원");
    expect(rowValue("목표 시점")).toBe("2028년 7월");
    expect(rowValue("위험 성향")).toBe("안정형");
    expect(rowValue("월 저축 예산")).toBe("100,000원");
    expect(rowValue("일시 예치금")).toBe("300,000원");
    expect(rowValue("비상 예비금")).toBe("700,000원");
  });

  it("프로필이 아니라 폼의 현재 값을 보여준다", async () => {
    await renderReview({
      overrides: { target_price: 9000000, target_move_in_ym: "2029-12" },
    });

    expect(rowValue("목표 가격")).toBe("9,000,000원");
    expect(rowValue("목표 시점")).toBe("2029년 12월");
  });

  it("전체를 고르면 서울 전체로 표기한다", async () => {
    await renderReview({ overrides: { target_region: "ALL" } });

    expect(rowValue("지역")).toBe("서울 전체");
  });

  it("고른 구의 이름을 표기한다", async () => {
    await renderReview({ overrides: { target_region: "11680" } });

    expect(rowValue("지역")).toBe("강남구");
  });

  it("사용자가 고치지 않는 프로필 정보도 함께 보여준다", async () => {
    await renderReview();

    expect(rowValue("학적")).toBe("대학 재학");
    expect(rowValue("고용 형태")).toBe("아르바이트");
    expect(rowValue("부모님과 거주")).toBe("예");
    expect(rowValue("연 소득 (증빙)")).toBe("960만원");
    expect(rowValue("자금 필요 시점")).toBe("2028.07.28");
  });

  it("마이데이터를 불러오지 않았으면 그 사실을 알린다", async () => {
    await renderReview();

    expect(
      screen.getByText(/아직 마이데이터를 불러오지 않았습니다/),
    ).toBeInTheDocument();
    expect(screen.queryByText("불러오기 완료")).not.toBeInTheDocument();
  });

  it("불러왔으면 마이데이터 요약을 보여준다", async () => {
    const { mydata } = await renderReview({ mydataLoaded: true });

    const demand = mydata.accounts.filter(
      (account) => account.account_kind === "demand",
    ).length;
    const savings = mydata.accounts.filter(
      (account) => account.account_kind === "savings",
    ).length;

    expect(screen.getByText("불러오기 완료")).toBeInTheDocument();
    expect(screen.getByText("기준일 2026.07.24")).toBeInTheDocument();
    expect(rowValue("입출금 계좌")).toBe(`${demand}건`);
    expect(rowValue("예적금 계좌")).toBe(`${savings}건`);
    expect(rowValue("대출")).toBe("0건");
    expect(rowValue("총 잔액")).toBe(formatWon(mydata.totals.total_balance));
    expect(rowValue("대출 잔액")).toBe("0원");
  });

  it("대출이 있는 페르소나는 대출 잔액을 보여준다", async () => {
    const { mydata } = await renderReview({
      personaId: WITH_LOAN,
      mydataLoaded: true,
    });

    expect(mydata.loans.length).toBeGreaterThan(0);
    expect(rowValue("대출")).toBe(`${mydata.loans.length}건`);
    expect(rowValue("대출 잔액")).toBe(
      formatWon(mydata.totals.total_loan_balance),
    );
  });

  it("대출 조건 네 값을 모두 보여준다", async () => {
    const [profile, mydata] = await Promise.all([
      loadProfile(SAMPLE),
      loadMydata(SAMPLE),
    ]);
    // SAMPLE(persona_e)에는 보유 자산 정보가 없다 — renderReview()의 주석과
    // 같은 이유로 이 값이 없으면 렌더 자체가 던진다.
    render(
      <Harness
        profile={profile}
        mydata={mydata}
        mydataLoaded={false}
        overrides={{ current_assets: 8000000 }}
      />,
    );

    expect(screen.getByText("30년 (360개월)")).toBeInTheDocument();
    expect(screen.getByText("생애최초 주택구입")).toBeInTheDocument();
    expect(screen.getByText("84㎡")).toBeInTheDocument();
    // toFormValues()는 필수생활비 기본값을 월평균지출과 같은 값으로 채운다
    // (지출 전액을 필수로 본다는 Task 3의 설계). 그래서 이 페르소나에서는 두
    // 값이 같은 문자열로 화면에 두 번 나타나 getByText가 모호해진다 — 어떤
    // 행인지 rowValue로 못박는다.
    expect(rowValue("필수 생활비")).toBe(
      formatWon(profile.finance.monthly_average_expense),
    );
  });
});
