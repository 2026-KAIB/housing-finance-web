import type { KakaoMapsNamespace } from "./kakao-types";

const SDK_URL = "https://dapi.kakao.com/v2/maps/sdk.js";

/** 첫 호출의 Promise를 캐시해, 패널을 여닫아도 스크립트가 한 번만 주입되게 한다. */
let pending: Promise<KakaoMapsNamespace> | null = null;

export function loadKakaoMaps(appKey: string): Promise<KakaoMapsNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("카카오맵은 브라우저에서만 불러올 수 있습니다"),
    );
  }

  const loaded = window.kakao?.maps;
  if (loaded?.Map) return Promise.resolve(loaded);
  if (pending) return pending;

  pending = new Promise<KakaoMapsNamespace>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${SDK_URL}?appkey=${encodeURIComponent(appKey)}&autoload=false`;
    script.async = true;

    script.onload = () => {
      const maps = window.kakao?.maps;
      if (!maps) {
        reject(new Error("카카오맵 SDK를 초기화하지 못했습니다"));
        return;
      }
      // autoload=false라 SDK가 스스로 초기화하지 않는다. onload 시점에는
      // maps.Map이 아직 없을 수 있으므로 load() 콜백까지 기다린다.
      maps.load(() => resolve(maps));
    };

    script.onerror = () => {
      reject(new Error("카카오맵 SDK를 불러오지 못했습니다"));
    };

    document.head.appendChild(script);
  });

  // 실패한 Promise를 캐시에 남기면 재시도가 영영 막힌다.
  pending.catch(() => {
    pending = null;
  });

  return pending;
}
