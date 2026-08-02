import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { loadPersonaIndex } from "@/lib/fixtures/loader";

import { PersonaGrid } from "./persona-grid";

const personas = loadPersonaIndex().personas;

describe("PersonaGrid", () => {
  it("6명을 카드로 보여준다", () => {
    render(<PersonaGrid personas={personas} />);
    expect(screen.getAllByRole("link")).toHaveLength(6);
  });

  it("카드가 입력 화면으로 연결된다", () => {
    render(<PersonaGrid personas={personas} />);
    const first = screen.getAllByRole("link")[0];
    expect(first).toHaveAttribute(
      "href",
      `/input?persona=${personas[0].persona_id}`,
    );
  });

  it("금액을 한글 단위로 보여준다", () => {
    render(<PersonaGrid personas={[personas[0]]} />);
    expect(screen.getByText("80만원")).toBeInTheDocument();
    expect(screen.getByText("3억 2,500만원")).toBeInTheDocument();
  });

  it("카테고리 필터가 목록을 줄인다", async () => {
    const user = userEvent.setup();
    render(<PersonaGrid personas={personas} />);

    await user.click(screen.getByRole("button", { name: /여유형/ }));
    expect(screen.getAllByRole("link")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: /취약형/ }));
    expect(screen.getAllByRole("link")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: /전체/ }));
    expect(screen.getAllByRole("link")).toHaveLength(6);
  });

  it("배분 불가 페르소나에 상태 배지를 붙인다", () => {
    render(<PersonaGrid personas={personas} />);
    expect(screen.getAllByText("배분 불가")).toHaveLength(1);
    expect(screen.queryByText("배분 불필요")).not.toBeInTheDocument();
  });
});
