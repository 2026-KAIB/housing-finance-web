"use client";

import { useState } from "react";

import { KakaoMap } from "@/components/map/kakao-map";
import { Button } from "@/components/ui/button";

const TOGGLES = [
  { value: "region", label: "지역" },
  { value: "price", label: "목표 가격" },
] as const;

type ToggleValue = (typeof TOGGLES)[number]["value"];

/**
 * 지도 시각화 골격이다. 폼(react-hook-form)에 값을 쓰지 않으며, 토글 값도
 * 아직 지도에 영향을 주지 않는다 — 탭별 내용이 갈릴 때의 분기 지점이다.
 */
export function DesiredHomePanel({ id }: { id: string }) {
  const [selected, setSelected] = useState<ToggleValue>("region");

  return (
    <div
      id={id}
      className="grid gap-3 rounded-xl border border-line bg-surface/60 p-4"
    >
      <div role="group" aria-label="희망 주택 조건" className="flex gap-2">
        {TOGGLES.map((toggle) => (
          <Button
            key={toggle.value}
            type="button"
            size="sm"
            variant={selected === toggle.value ? "brand" : "outline"}
            aria-pressed={selected === toggle.value}
            onClick={() => setSelected(toggle.value)}
          >
            {toggle.label}
          </Button>
        ))}
      </div>

      {/* 두 토글이 같은 지도를 공유하므로 지도는 토글 바깥에 한 번만 둔다.
          탭 컴포넌트를 쓰면 전환마다 지도가 파괴·재생성된다. */}
      <KakaoMap className="h-[260px] md:h-[360px]" />
    </div>
  );
}
