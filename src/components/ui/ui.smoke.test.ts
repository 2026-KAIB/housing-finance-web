import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

import { buttonVariants } from "./button";

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

describe("brand 버튼 variant", () => {
  it("옐로 채움에 브라운 글자를 쓴다", () => {
    const classes = buttonVariants({ variant: "brand" });

    expect(classes).toContain("bg-brand");
    expect(classes).toContain("text-brand-ink");
    expect(classes).toContain("hover:bg-brand-strong");
  });

  it("옐로 위에 흰 글자를 쓰지 않는다", () => {
    // #ffcc00 위의 흰 글자는 1.51:1이다. text-brand-ink(#3d3730)는 7.77:1.
    expect(buttonVariants({ variant: "brand" })).not.toContain("text-white");
  });
});
