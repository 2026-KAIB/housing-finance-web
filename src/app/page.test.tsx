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
});
