import { ApiError } from "./errors";
import type { SimulationInputPayload } from "./simulation-input";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/+$/, "");

type ApiErrorBody = {
  detail?: string;
};

export async function apiRequest<ResponseBody>(
  path: string,
  init?: RequestInit,
): Promise<ResponseBody> {
  if (!path.startsWith("/api/")) {
    throw new Error("API path must start with /api/");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new Error(body.detail ?? `API request failed: ${response.status}`);
  }

  return (await response.json()) as ResponseBody;
}

/** FastAPI가 422에서 돌려주는 검증 오류 한 건. `loc`의 마지막 항목이 필드 이름이다. */
type FastApiValidationIssue = {
  loc?: unknown[];
  msg?: string;
};

/**
 * FastAPI의 `detail`은 문자열(대부분의 오류)일 수도, 리스트(422 검증 오류)일
 * 수도 있다. 리스트를 문자열로 가정하면 `""`가 되어 어떤 필드가 왜 걸렸는지
 * 사라진다 — 예: emergency_reserve > liquid_assets일 때. 각 항목의 필드
 * 이름과 메시지를 이어붙여 사용자가 무엇을 고쳐야 하는지 알 수 있게 한다.
 */
function joinValidationIssues(issues: unknown[]): string {
  return issues
    .map((issue) => {
      const { loc, msg } = issue as FastApiValidationIssue;
      const field = Array.isArray(loc) ? loc.at(-1) : undefined;
      const message = typeof msg === "string" ? msg : "";
      return field !== undefined && field !== null
        ? `${field}: ${message}`
        : message;
    })
    .filter((line) => line.length > 0)
    .join("; ");
}

async function detailOf(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) return joinValidationIssues(body.detail);
    return "";
  } catch {
    return "";
  }
}

/** 카드용 계산. AI를 부르지 않아 빠르다. */
export async function postSimulation(
  input: SimulationInputPayload,
): Promise<unknown> {
  const response = await fetch("/api/v1/simulations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new ApiError(response.status, await detailOf(response));
  }
  return response.json();
}

/**
 * 보고서를 만들어 보관하고 그 id를 돌려준다.
 *
 * 응답 본문의 PDF 바이트를 쓰지 않고 id만 받는 이유는, 뷰어가
 * `GET /api/v1/reports/{id}.pdf`를 걸어야 새로고침과 새 탭 열기가 살아 있기
 * 때문이다. 두 번째 요청은 보관된 파일을 읽을 뿐이라 AI도 렌더도 다시
 * 돌지 않는다.
 */
export async function postReportPdf(
  input: SimulationInputPayload,
): Promise<string> {
  const response = await fetch("/api/v1/reports?format=pdf", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new ApiError(response.status, await detailOf(response));
  }

  const reportId = response.headers.get("X-Report-Id");
  if (!reportId) {
    throw new ApiError(response.status, "응답에 보고서 id가 없습니다.");
  }
  return reportId;
}
