"use client";

import { FormEvent, useMemo, useState } from "react";

const ADMIN_ID = "kingoyaguban";
const ADMIN_PASSWORD = "kingo2026!";
const ADMIN_AUTH_KEY = "admin-auth-v1";

function getStoredAuthState() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const raw = window.localStorage.getItem(ADMIN_AUTH_KEY);
    if (!raw) {
      return false;
    }
    const saved = JSON.parse(raw) as { ok: boolean } | null;
    return saved?.ok === true;
  } catch {
    window.localStorage.removeItem(ADMIN_AUTH_KEY);
    return false;
  }
}

export function AdminAuthGate({ children }: Readonly<{ children: React.ReactNode }>) {
  const [isAuthenticated, setIsAuthenticated] = useState(getStoredAuthState);
  const [adminId, setAdminId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState("");

  function handleLogin(event: FormEvent) {
    event.preventDefault();
    if (adminId !== ADMIN_ID || adminPassword !== ADMIN_PASSWORD) {
      setError("아이디 또는 비밀번호가 일치하지 않습니다.");
      return;
    }

    const nextState = { ok: true, signedAt: new Date().toISOString() };
    window.localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(nextState));
    setIsAuthenticated(true);
    setError("");
    setAdminPassword("");
  }

  function handleLogout() {
    window.localStorage.removeItem(ADMIN_AUTH_KEY);
    setIsAuthenticated(false);
  }

  const canAccess = useMemo(() => isAuthenticated, [isAuthenticated]);

  if (!canAccess) {
    return (
      <main className="mx-auto flex w-full max-w-md gap-5 px-4 py-12 sm:px-6 lg:px-8">
        <section className="w-full rounded-[28px] border border-line bg-card p-6 shadow-[0_16px_40px_rgba(16,35,63,0.08)] sm:p-7">
          <div className="rounded-[20px] bg-[linear-gradient(135deg,#133c73_0%,#24579f_58%,#4f8fe2_100%)] p-5 text-white">
            <p className="text-sm font-semibold text-white/85">관리자 전용</p>
            <h1 className="mt-2 text-xl font-bold sm:text-2xl">
              관리자 로그인
            </h1>
            <p className="mt-2 text-sm text-white/80">
              아이디/비밀번호를 입력해야 관리자 페이지를 사용할 수 있습니다.
            </p>
          </div>
          <form
            onSubmit={handleLogin}
            className="mt-6 space-y-4 rounded-[22px] border border-line bg-soft p-5"
          >
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-muted">
                관리자 아이디
              </span>
              <input
                value={adminId}
                onChange={(event) => setAdminId(event.target.value)}
                className="h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground outline-none transition-colors focus:border-primary"
                placeholder="아이디"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-muted">
                비밀번호
              </span>
              <input
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                type="password"
                className="h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground outline-none transition-colors focus:border-primary"
                placeholder="비밀번호"
              />
            </label>
            {error ? (
              <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white"
            >
              로그인
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleLogout}
        className="fixed right-5 top-5 z-20 rounded-full border border-line bg-white px-3 py-2 text-xs font-semibold text-foreground shadow-sm"
      >
        로그아웃
      </button>
      {children}
    </div>
  );
}
