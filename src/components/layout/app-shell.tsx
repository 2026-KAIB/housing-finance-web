import Link from "next/link";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <header className="header">
        <Link className="brand" href="/">
          HOME PLAN
        </Link>
        <nav className="nav" aria-label="주요 메뉴">
          <Link href="/input">정보 입력</Link>
          <Link href="/dashboard">전략 비교</Link>
          <Link href="/report">보고서</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}

