import { describe, expect, it } from "vitest";

import { ApiError, apiErrorMessage } from "./errors";

describe("apiErrorMessage", () => {
  it("501은 보관 미설정으로 읽힌다", () => {
    expect(apiErrorMessage(new ApiError(501, "보관 미설정"))).toContain(
      "REPORT_ARCHIVE_PROVIDER",
    );
  });

  it("502는 백엔드가 꺼져 있다는 뜻으로 읽힌다", () => {
    expect(apiErrorMessage(new ApiError(502, ""))).toContain("실행 중인지");
  });

  it("503은 서버가 준 원인을 그대로 보여준다", () => {
    // 폰트 누락과 DB 접속 실패는 다른 문제다. 하나로 뭉개면 고칠 수 없다.
    expect(
      apiErrorMessage(new ApiError(503, "PDF를 만들지 못했습니다: 글꼴 없음")),
    ).toContain("글꼴 없음");
  });

  it("모르는 오류는 지어내지 않는다", () => {
    expect(apiErrorMessage(new Error("boom"))).toContain("boom");
  });
});
