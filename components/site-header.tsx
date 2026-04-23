import Link from "next/link";
import { NavLinks } from "@/components/nav-links";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/60 bg-white/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <Link href="/" className="block">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Baseball Record
          </p>
          <h1 className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
            킹고야구반배 교내야구대회
          </h1>
        </Link>
        <NavLinks />
      </div>
    </header>
  );
}
