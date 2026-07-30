import { afterEach, describe, expect, it, vi } from "vitest";

import type { KakaoMapsNamespace } from "./kakao-types";

/** SDK 네임스페이스 대역. load()는 콜백을 즉시 실행한다. */
function fakeMaps(): KakaoMapsNamespace {
  return {
    LatLng: vi.fn() as unknown as KakaoMapsNamespace["LatLng"],
    Map: vi.fn() as unknown as KakaoMapsNamespace["Map"],
    load: (callback: () => void) => callback(),
  };
}

function injectedScripts(): HTMLScriptElement[] {
  return Array.from(
    document.querySelectorAll<HTMLScriptElement>(
      'script[src*="dapi.kakao.com"]',
    ),
  );
}

/**
 * 로더는 모듈 스코프에 Promise를 캐시한다. 테스트마다 모듈을 다시 평가해
 * 캐시를 비운다 — 프로덕션 코드에 테스트 전용 리셋 함수를 두지 않기 위해서다.
 */
async function importLoader() {
  vi.resetModules();
  return import("./kakao-loader");
}

afterEach(() => {
  injectedScripts().forEach((script) => script.remove());
  delete window.kakao;
});

describe("loadKakaoMaps", () => {
  it("appkey와 autoload=false를 붙인 SDK 스크립트를 주입한다", async () => {
    const { loadKakaoMaps } = await importLoader();

    void loadKakaoMaps("TEST_KEY");

    const [script] = injectedScripts();
    expect(script).toBeDefined();
    expect(script.src).toContain("appkey=TEST_KEY");
    expect(script.src).toContain("autoload=false");
  });

  it("SDK 로드가 끝나면 maps 네임스페이스로 resolve한다", async () => {
    const { loadKakaoMaps } = await importLoader();

    const promise = loadKakaoMaps("TEST_KEY");
    const maps = fakeMaps();
    window.kakao = { maps };
    injectedScripts()[0].dispatchEvent(new Event("load"));

    await expect(promise).resolves.toBe(maps);
  });

  it("여러 번 불러도 스크립트를 한 번만 주입한다", async () => {
    const { loadKakaoMaps } = await importLoader();

    const first = loadKakaoMaps("TEST_KEY");
    const second = loadKakaoMaps("TEST_KEY");

    expect(injectedScripts()).toHaveLength(1);
    expect(first).toBe(second);
  });

  it("이미 로드된 SDK가 있으면 스크립트를 주입하지 않는다", async () => {
    const maps = fakeMaps();
    window.kakao = { maps };
    const { loadKakaoMaps } = await importLoader();

    await expect(loadKakaoMaps("TEST_KEY")).resolves.toBe(maps);
    expect(injectedScripts()).toHaveLength(0);
  });

  it("로드에 실패하면 reject하고 다음 호출에서 다시 시도한다", async () => {
    const { loadKakaoMaps } = await importLoader();

    const first = loadKakaoMaps("TEST_KEY");
    injectedScripts()[0].dispatchEvent(new Event("error"));
    await expect(first).rejects.toThrow("카카오맵 SDK를 불러오지 못했습니다");

    injectedScripts().forEach((script) => script.remove());
    void loadKakaoMaps("TEST_KEY");
    expect(injectedScripts()).toHaveLength(1);
  });
});
