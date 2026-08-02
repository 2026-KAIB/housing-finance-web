"use client";

import { useEffect, useState } from "react";

import { postReportPdf } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import {
  FIXED_ACQUISITION_ASSUMPTIONS,
  type SimulationInputPayload,
} from "@/lib/api/simulation-input";

/**
 * 보고서 PDF를 대시보드 안에서 그대로 보여준다.
 *
 * 응답 본문의 바이트를 blob URL로 쓰지 않고 `X-Report-Id`로 GET URL을 다시
 * 건다. 그래야 새로고침과 새 탭 열기가 살아 있다. 두 번째 요청은 보관된
 * 파일을 읽을 뿐이라 AI도 렌더도 다시 돌지 않는다.
 *
 * 스크롤·페이지 번호·확대는 브라우저 내장 PDF 뷰어가 처리한다.
 */
export function ReportViewer({ input }: { input: SimulationInputPayload }) {
  const [reportId, setReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    postReportPdf(input)
      .then((id) => {
        if (!cancelled) setReportId(id);
      })
      .catch((cause) => {
        if (!cancelled) setError(apiErrorMessage(cause));
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(input)]);

  const href = reportId ? `/api/v1/reports/${reportId}.pdf` : null;

  return (
    <section className="grid gap-3 pb-12">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-bold tracking-[-0.03em]">실행 보고서</h2>
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-accent underline"
          >
            새 탭에서 열기
          </a>
        )}
      </div>

      <ul className="m-0 grid list-none gap-1 p-0 text-xs text-brand-muted">
        {FIXED_ACQUISITION_ASSUMPTIONS.map((note) => (
          <li key={note}>· {note}</li>
        ))}
      </ul>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </p>
      )}

      {!error && !href && (
        <p
          className="rounded-xl border border-line p-4 text-sm text-brand-muted"
          role="status"
        >
          보고서를 만들고 있습니다. 계산과 서술 검증을 거치므로 20~30초 걸립니다.
        </p>
      )}

      {href && (
        <iframe
          title="실행 보고서"
          src={href}
          className="h-[80vh] w-full rounded-xl border border-line"
        />
      )}
    </section>
  );
}
