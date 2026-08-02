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
 *
 * `subject`는 실패한 대상의 이름이다. 이 함수는 원래 보고서 호출용으로
 * 쓰였다가 카드(`/simulations`) 호출에도 그대로 재사용됐는데, 문구가
 * "보고서를…"로 고정돼 있어 카드가 실패해도 화면에는 "보고서를 불러오지
 * 못했습니다"가 떴다. 호출자가 실패한 대상을 명시하게 한다.
 */
export function apiErrorMessage(error: unknown, subject = "보고서"): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error
      ? `${subject}를 불러오지 못했습니다: ${error.message}`
      : `${subject}를 불러오지 못했습니다.`;
  }

  if (error.status === 501) {
    return "보고서 보관이 설정되지 않았습니다(REPORT_ARCHIVE_PROVIDER).";
  }
  if (error.status === 502) {
    return "백엔드에 닿지 못했습니다. 서버가 실행 중인지 확인하세요.";
  }
  // 504는 502와 다른 사실을 말한다 — 백엔드가 죽은 게 아니라 시간 안에
  // 끝내지 못한 것이다(예: 보고서 렌더가 프록시의 타임아웃 예산을 넘김).
  // "서버가 실행 중인지 확인하세요"는 여기서 거짓일 수 있다: 서버는
  // 실행 중이고, 지금도 계산하고 있을 수 있다.
  if (error.status === 504) {
    return `${subject} 요청이 시간 안에 끝나지 않아 중단했습니다. 서버에서는 계산이 계속 진행 중일 수 있습니다.`;
  }
  if (error.status === 503) {
    return error.detail || `${subject}를 만들지 못했습니다.`;
  }
  return error.detail || `${subject}를 불러오지 못했습니다(${error.status}).`;
}
