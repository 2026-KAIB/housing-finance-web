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

  it("504는 502와 다르게, 서버가 죽었다고 말하지 않는다", () => {
    // 보고서 렌더는 20~30초가 걸리는 정상 동작이다. 504는 그 시간 안에
    // 프록시가 먼저 끊었다는 뜻이지, 백엔드가 꺼졌다는 뜻이 아니다.
    const message = apiErrorMessage(new ApiError(504, ""));

    expect(message).toContain("시간 안에");
    expect(message).not.toContain("실행 중인지 확인하세요");
  });

  it("subject를 지정하면 그 이름으로 실패를 말한다", () => {
    expect(apiErrorMessage(new Error("boom"), "계산 결과")).toContain(
      "계산 결과를 불러오지 못했습니다",
    );
    expect(
      apiErrorMessage(new ApiError(422, ""), "계산 결과"),
    ).toContain("계산 결과를 불러오지 못했습니다");
  });

  it("subject를 지정하지 않으면 보고서로 읽힌다(기존 호출자 호환)", () => {
    expect(apiErrorMessage(new Error("boom"))).toContain(
      "보고서를 불러오지 못했습니다",
    );
  });
});
