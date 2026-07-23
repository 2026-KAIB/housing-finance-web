import Link from "next/link";

const services = [
  {
    step: "01",
    title: "금융정보 입력",
    description: "소득·지출·자산·부채와 목표 주택 정보를 입력합니다.",
  },
  {
    step: "02",
    title: "전략 비교",
    description: "예적금 포트폴리오와 대출 가능액을 함께 계산합니다.",
  },
  {
    step: "03",
    title: "실행 보고서",
    description: "스트레스 테스트를 포함한 월별 행동계획을 확인합니다.",
  },
];

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">HOUSING FINANCE CONSULTING</p>
        <h1>내 금융 흐름으로 계산하는 주택구매 로드맵</h1>
        <p>
          단순한 최대 대출한도가 아니라 비상자금, 저축계획, 정책대출과 금리 위험을
          함께 비교합니다.
        </p>
        <div className="actions">
          <Link className="button" href="/input">
            진단 시작하기
          </Link>
          <Link className="button secondary" href="/dashboard">
            결과 화면 보기
          </Link>
        </div>
      </section>

      <section className="grid" aria-label="서비스 흐름">
        {services.map((service) => (
          <article className="card" key={service.step}>
            <span>{service.step}</span>
            <h2>{service.title}</h2>
            <p>{service.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

