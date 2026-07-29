import Link from "next/link";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[min(1120px,calc(100%-40px))]">
      <header className="flex min-h-[72px] flex-col items-start justify-center gap-2.5 border-b border-line md:flex-row md:items-center md:justify-between md:gap-0">
        <Link className="font-extrabold tracking-[-0.04em]" href="/">
          HOME PLAN
        </Link>
        <nav
          className="flex gap-5 pb-4 text-sm text-muted md:pb-0"
          aria-label="주요 메뉴"
        >
          <Link href="/personas">페르소나 선택</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
