/**
 * 카카오맵 SDK 전체 타입을 가져오지 않고, 이 프로젝트가 실제로 호출하는
 * 표면만 선언한다. 쓰지 않는 API가 늘어나면 그때 여기에 추가한다.
 */

export interface KakaoLatLng {
  getLat(): number;
  getLng(): number;
}

export interface KakaoMapOptions {
  center: KakaoLatLng;
  level: number;
}

export interface KakaoMapInstance {
  setCenter(latlng: KakaoLatLng): void;
  setLevel(level: number): void;
}

export interface KakaoMapsNamespace {
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  Map: new (
    container: HTMLElement,
    options: KakaoMapOptions,
  ) => KakaoMapInstance;
  /** autoload=false로 받은 SDK를 명시적으로 초기화한다. */
  load(callback: () => void): void;
}

declare global {
  interface Window {
    kakao?: { maps?: KakaoMapsNamespace };
  }
}
