/** 백엔드가 돌려준 실패. 상태 코드와 서버가 준 사유를 함께 보관한다. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
  ) {
    super(`API ${status}: ${detail}`);
    this.name = "ApiError";
  }
}

/**
 * 실패를 화면 문구로 옮긴다.
 *
 * 상태별로 나눈다. 하나의 "불러오지 못했습니다"로 뭉개면 무엇을 고쳐야
 * 하는지 알 수 없다 — 글꼴 미설치와 DB 미연결은 다른 문제다.
 */
export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error
      ? `보고서를 불러오지 못했습니다: ${error.message}`
      : "보고서를 불러오지 못했습니다.";
  }

  if (error.status === 501) {
    return "보고서 보관이 설정되지 않았습니다(REPORT_ARCHIVE_PROVIDER).";
  }
  if (error.status === 502 || error.status === 504) {
    return "백엔드에 닿지 못했습니다. 서버가 실행 중인지 확인하세요.";
  }
  if (error.status === 503) {
    return error.detail || "보고서를 만들지 못했습니다.";
  }
  return error.detail || `보고서를 불러오지 못했습니다(${error.status}).`;
}
