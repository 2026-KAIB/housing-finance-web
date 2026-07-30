import Link from "next/link";

import { loadPersonaIndex } from "@/lib/fixtures/loader";

const services = [
  {
    step: "01",
    title: "정보 입력",
    description: "기본 정보와 목표 금액·시점을 입력합니다.",
  },
  {
    step: "02",
    title: "마이데이터 연동",
    description: "계좌·예적금·대출·거래내역을 불러옵니다.",
  },
  {
    step: "03",
    title: "예적금 포트폴리오",
    description: "목표 시점까지의 예적금 배분 결과를 확인합니다.",
  },
];

export default function HomePage() {
  // 실사용이라면 빈 폼으로 시작한다. 프로토타입은 프리필된 값이 있어야 결과까지
  // 이어지므로 첫 페르소나로 step 1에 들어가고, 그 안의 선택기로 바꾼다.
  const [entryPersona] = loadPersonaIndex().personas;

  return (
    <main>
      <section className="grid gap-6 pt-16 md:pt-24 pb-16">
        <p className="m-0 font-bold text-accent">
          HOUSING FINANCE CONSULTING
        </p>
        <h1 className="m-0 max-w-[760px] text-[clamp(40px,7vw,72px)] font-bold leading-[1.05] tracking-[-0.06em]">
          내 금융 흐름으로 계산하는 주택 매매 자금 로드맵
        </h1>
        <p className="m-0 max-w-[680px] text-lg leading-[1.7] text-brand-muted">
          단순한 금리 비교가 아니라 비상자금, 저축여력, 목표 시점을 함께
          계산합니다.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-accent bg-accent px-5 font-bold text-white"
            href={`/input?persona=${entryPersona.persona_id}`}
          >
            금융 라이프 컨설팅 받기
          </Link>
        </div>
      </section>

      <section
        className="grid grid-cols-1 gap-4 pb-20 md:grid-cols-3"
        aria-label="서비스 흐름"
      >
        {services.map((service) => (
          <article
            className="min-h-[180px] rounded-[18px] border border-line bg-surface/90 p-6"
            key={service.step}
          >
            <span className="text-[13px] font-extrabold text-accent">
              {service.step}
            </span>
            <h2 className="mt-9 mb-2.5 text-[22px] font-bold tracking-[-0.03em]">
              {service.title}
            </h2>
            <p className="m-0 leading-relaxed text-brand-muted">
              {service.description}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
