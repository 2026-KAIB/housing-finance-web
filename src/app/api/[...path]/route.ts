import type { NextRequest } from "next/server";

import { requestTimeoutMs } from "./timeout-budget";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProxyContext = {
  params: Promise<{
    path: string[];
  }>;
};

const HOP_BY_HOP_HEADERS = [
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

function backendOrigin(): URL {
  const configured =
    process.env.BACKEND_API_URL?.trim() || "http://127.0.0.1:8000";
  const origin = new URL(configured);

  if (origin.protocol !== "http:" && origin.protocol !== "https:") {
    throw new Error("BACKEND_API_URL must use http or https");
  }

  return origin;
}

function buildBackendUrl(
  path: string[],
  search: string,
): URL {
  const target = backendOrigin();
  const basePath = target.pathname.replace(/\/+$/, "");
  const encodedPath = path.map(encodeURIComponent).join("/");

  target.pathname = `${basePath}/api/${encodedPath}`;
  target.search = search;
  return target;
}

function forwardedHeaders(source: Headers): Headers {
  const headers = new Headers(source);
  for (const header of HOP_BY_HOP_HEADERS) {
    headers.delete(header);
  }
  return headers;
}

async function proxyRequest(
  request: NextRequest,
  context: ProxyContext,
): Promise<Response> {
  try {
    const { path } = await context.params;
    const target = buildBackendUrl(path, request.nextUrl.search);
    const body =
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer();
    const upstream = await fetch(target, {
      method: request.method,
      headers: forwardedHeaders(request.headers),
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.any([
        request.signal,
        AbortSignal.timeout(requestTimeoutMs(path)),
      ]),
    });
    const responseHeaders = forwardedHeaders(upstream.headers);
    responseHeaders.delete("content-encoding");

    return new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === "TimeoutError";
    console.error("Backend API proxy failed", error);
    return Response.json(
      {
        detail: timedOut
          ? "Backend API request timed out"
          : "Backend API is unavailable",
      },
      { status: timedOut ? 504 : 502 },
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const OPTIONS = proxyRequest;
export const HEAD = proxyRequest;
