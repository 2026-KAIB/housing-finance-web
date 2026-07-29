import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("shadcn 설치 확인", () => {
  it("cn 유틸이 클래스를 병합한다", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("필요한 컴포넌트 7종을 불러올 수 있다", async () => {
    const modules = await Promise.all([
      import("./button"),
      import("./card"),
      import("./table"),
      import("./tabs"),
      import("./badge"),
      import("./input"),
      import("./label"),
    ]);

    expect(modules[0].Button).toBeTypeOf("function");
    expect(modules[1].Card).toBeTypeOf("function");
    expect(modules[2].Table).toBeTypeOf("function");
    expect(modules[3].Tabs).toBeDefined();
    expect(modules[4].Badge).toBeTypeOf("function");
    expect(modules[5].Input).toBeTypeOf("function");
    expect(modules[6].Label).toBeDefined();
  });
});
