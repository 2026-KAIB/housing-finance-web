import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { loadPersonaIndex } from "@/lib/fixtures/loader";

import HomePage from "./page";

describe("HomePage", () => {
  it("시작 버튼이 페르소나 목록을 거치지 않고 step 1로 보낸다", () => {
    const [entry] = loadPersonaIndex().personas;
    render(<HomePage />);

    const cta = screen.getByRole("link", { name: "금융 라이프 컨설팅 받기" });

    expect(cta).toHaveAttribute("href", `/input?persona=${entry.persona_id}`);
  });

  it("진입 페르소나는 픽스처 목록에 있는 값이다", () => {
    render(<HomePage />);

    const cta = screen.getByRole("link", { name: "금융 라이프 컨설팅 받기" });
    const personaId = new URL(
      cta.getAttribute("href") ?? "",
      "http://localhost",
    ).searchParams.get("persona");

    expect(
      loadPersonaIndex().personas.map((persona) => persona.persona_id),
    ).toContain(personaId);
  });

  it("서비스 흐름 3단계를 보여준다", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { level: 2, name: "정보 입력" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "마이데이터 연동" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "예적금 포트폴리오" }),
    ).toBeInTheDocument();
  });

  // 캐릭터는 public 경로 문자열로 참조하므로 파일이 없어도 타입체크·렌더가
  // 통과하고 런타임 404로만 드러난다. 파일 자체를 테스트로 붙잡는다.
  //
  // 이 파일은 jsdom 환경에서 실행된다. `new URL("리터럴", import.meta.url)`처럼
  // 상대 경로를 문자열 리터럴로 바로 넘기면 Vite의 정적 애셋 URL 변환이 이를
  // 감지해 브라우저용 `/@fs/...` 절대 URL로 바꿔버리고, fileURLToPath가
  // "The URL must be of scheme file"로 실패한다. 경로를 변수에 담아 넘기면
  // Vite가 정적으로 분석하지 못해 변환을 건너뛰고 런타임에 실제 file:// URL로
  // 해석된다.
  it("캐릭터 이미지 파일이 public에 있다", () => {
    const relativePath = "../../public/character/kb-star.png";
    const assetPath = fileURLToPath(new URL(relativePath, import.meta.url));

    expect(existsSync(assetPath)).toBe(true);
  });
});
