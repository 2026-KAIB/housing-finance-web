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
