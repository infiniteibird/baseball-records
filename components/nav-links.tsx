"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "홈" },
  { href: "/games", label: "경기 결과" },
  { href: "/standings", label: "팀 순위" },
  { href: "/players", label: "선수 기록" },
  { href: "/teams", label: "팀 페이지" },
  { href: "/admin", label: "관리자 입력" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              isActive
                ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(19,60,115,0.22)]"
                : "rounded-full border border-line bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
