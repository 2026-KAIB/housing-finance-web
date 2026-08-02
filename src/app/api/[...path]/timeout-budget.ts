const REQUEST_TIMEOUT_MS = 30_000;
// 보고서 PDF는 AI 호출 두 번과 PDF 렌더를 거친다 — ReportViewer가 사용자에게
// 미리 알리는 20~30초가 여기서 나온다. 기본 30초 예산을 그대로 쓰면 정상적인
// 렌더가 끝나기 전에 프록시가 먼저 끊어 504를 던지고, apiErrorMessage는 이를
// "서버가 꺼져 있다"로 읽는다. 그렇다고 기본값 자체를 늘리지는 않는다 — 전역
// 타임아웃을 늘리면 정말로 죽은 백엔드에 대한 모든 요청이 그만큼 오래 걸린
// 뒤에야 실패로 보이기 때문이다. 보고서 경로에만 별도로 더 큰 예산을 둔다.
const REPORT_REQUEST_TIMEOUT_MS = 120_000;
const REPORTS_PATH_SEGMENT = "reports";

/**
 * 요청 경로별 타임아웃 예산.
 *
 * `/api/v1/reports`(그 하위 경로 포함)만 더 긴 예산을 받는다. route.ts 밖의
 * 이 파일에 따로 둔 이유는 두 가지다: 순수 함수로 뽑아 프록시 전체를 흉내
 * 내지 않고도 예산 선택 자체를 테스트할 수 있게 하기 위해서, 그리고
 * Next.js가 `app/**\/route.ts`에서 라우트 핸들러·설정 상수 외의 export를
 * 허용하지 않기 때문이다(타입 체크 시 에러가 난다).
 */
export function requestTimeoutMs(path: string[]): number {
  return path[1] === REPORTS_PATH_SEGMENT
    ? REPORT_REQUEST_TIMEOUT_MS
    : REQUEST_TIMEOUT_MS;
}
