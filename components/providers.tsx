"use client";

import { BaseballProvider } from "@/store/baseball-context";

export function Providers({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <BaseballProvider>{children}</BaseballProvider>;
}
