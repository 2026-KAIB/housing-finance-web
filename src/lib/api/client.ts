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

async function detailOf(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    return typeof body.detail === "string" ? body.detail : "";
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
