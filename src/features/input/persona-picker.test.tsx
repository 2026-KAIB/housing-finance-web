import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadPersonaIndex } from "@/lib/fixtures/loader";

import { PersonaPicker } from "./persona-picker";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const SAMPLE = "persona_e_college_student_basic";
const OTHER = "persona_m_college_student_09_affluent";

function renderPicker() {
  const personas = loadPersonaIndex().personas;
  render(<PersonaPicker personaId={SAMPLE} personas={personas} />);
  return personas;
}

describe("PersonaPicker", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("페르소나 20명을 모두 선택지로 둔다", () => {
    const personas = renderPicker();

    expect(screen.getAllByRole("option")).toHaveLength(personas.length);
    expect(personas).toHaveLength(20);
  });

  it("현재 페르소나가 선택되어 있다", () => {
    renderPicker();

    expect(
      screen.getByLabelText("페르소나 선택 (프로토타입 전용)"),
    ).toHaveValue(SAMPLE);
  });

  it("표시 이름으로 선택지를 보여준다", () => {
    renderPicker();

    expect(
      screen.getByRole("option", { name: "대학생1(기본형)" }),
    ).toBeInTheDocument();
  });

  it("다른 페르소나를 고르면 해당 입력 화면으로 이동한다", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.selectOptions(
      screen.getByLabelText("페르소나 선택 (프로토타입 전용)"),
      OTHER,
    );

    expect(push).toHaveBeenCalledWith(`/input?persona=${OTHER}`);
  });
});
