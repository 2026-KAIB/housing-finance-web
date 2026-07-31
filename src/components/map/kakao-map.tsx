"use client";

import { useEffect, useRef, useState } from "react";

import { loadKakaoMaps } from "@/lib/map/kakao-loader";
import { cn } from "@/lib/utils";

/** 남한 전체가 한 화면에 들어오는 중심과 줌 레벨. */
export const KOREA_CENTER = { lat: 36.5, lng: 127.9 };
export const KOREA_LEVEL = 13;

type Status = "missing-key" | "loading" | "ready" | "error";

const MESSAGE: Record<Exclude<Status, "ready">, string> = {
  "missing-key":
    "카카오맵 API 키가 설정되지 않았습니다. .env의 NEXT_PUBLIC_KAKAO_MAP_APP_KEY를 채워주세요.",
  loading: "지도를 불러오는 중…",
  error:
    "지도를 불러오지 못했습니다. 앱 키와 카카오 개발자 콘솔의 플랫폼 도메인 등록을 확인해주세요.",
};

export function KakaoMap({
  center = KOREA_CENTER,
  level = KOREA_LEVEL,
  className,
  ariaLabel = "대한민국 지도",
}: {
  center?: { lat: number; lng: number };
  level?: number;
  className?: string;
  ariaLabel?: string;
}) {
  // 빌드 시 인라인되는 값이라 컴포넌트 안에서 읽어도 비용이 없다.
  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY ?? "";
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>(
    appKey ? "loading" : "missing-key",
  );

  useEffect(() => {
    if (!appKey) return;
    let cancelled = false;

    loadKakaoMaps(appKey)
      .then((maps) => {
        if (cancelled || !containerRef.current) return;
        new maps.Map(containerRef.current, {
          center: new maps.LatLng(center.lat, center.lng),
          level,
        });
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
    // center를 객체째 의존성에 넣으면 매 렌더마다 지도가 다시 만들어진다.
  }, [appKey, center.lat, center.lng, level]);

  return (
    <section
      aria-label={ariaLabel}
      className={cn(
        "relative overflow-hidden rounded-lg border border-line bg-surface",
        className,
      )}
    >
      {appKey && <div ref={containerRef} className="h-full w-full" />}
      {status !== "ready" && (
        <p className="absolute inset-0 m-0 grid place-items-center px-6 text-center text-sm text-brand-muted">
          {MESSAGE[status]}
        </p>
      )}
    </section>
  );
}
