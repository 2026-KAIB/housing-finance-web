import Image from "next/image";
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
      <section className="grid items-center gap-8 pt-16 pb-16 md:grid-cols-[1.15fr_0.85fr] md:pt-24">
        <div className="order-2 grid gap-6 md:order-1">
          <p className="m-0 font-bold text-accent">
            HOUSING FINANCE CONSULTING
          </p>
          {/* 한 문장으로 두면 컬럼 폭에 맞춰 아무 데서나 접혀 "계/산하는"처럼
              끊긴다. 의미 단위로 줄을 직접 나누고, 폰트 크기도 각 줄이 컬럼
              안에 들어가는 선까지 낮춘다. break-keep은 좁은 화면에서 한 줄이
              더 접히더라도 단어 중간에서 끊기지 않게 한다. */}
          <h1 className="m-0 text-[clamp(28px,4.7vw,56px)] font-bold leading-[1.15] tracking-[-0.06em] break-keep">
            <span className="block">내 금융 흐름으로 계산하는</span>
            <span className="block">주택 매매 자금 로드맵</span>
          </h1>
          <p className="m-0 max-w-[680px] text-lg leading-[1.7] text-brand-muted">
            단순한 금리 비교가 아니라 비상자금, 저축여력, 목표 시점을 함께
            계산합니다.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-brand-strong bg-brand px-5 font-bold text-brand-ink transition-colors hover:bg-brand-strong"
              href={`/input?persona=${entryPersona.persona_id}`}
            >
              금융 라이프 컨설팅 받기
            </Link>
          </div>
        </div>

        <div className="order-1 flex justify-center md:order-2 md:justify-end">
          <div className="relative flex aspect-square w-36 items-center justify-center md:w-[260px]">
            {/* 캐릭터 몸통이 옐로라 솔리드 옐로 배경에서는 분리가 약하다.
                부드러운 글로우로 브랜드색을 깔고 캐릭터는 띄운다. */}
            <div
              aria-hidden
              className="absolute inset-0 rounded-full bg-[radial-gradient(circle,var(--color-brand)_0%,transparent_70%)] opacity-60"
            />
            <Image
              alt="KB 부동산 캐릭터"
              className="relative h-auto w-full"
              height={556}
              priority
              src="/character/kb-star.png"
              width={560}
            />
          </div>
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
