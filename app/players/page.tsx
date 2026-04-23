"use client";

import { PlayersPageClient } from "@/components/players-page-client";
import { SectionCard } from "@/components/section-card";
import { useBaseballData } from "@/store/baseball-context";

export default function PlayersPage() {
  const { displayHitters, displayPitchers, playerTeams } =
    useBaseballData();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#133c73_0%,#24579f_58%,#4f8fe2_100%)] px-5 py-6 text-white shadow-[0_20px_50px_rgba(19,60,115,0.24)] sm:px-8 sm:py-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-white/75">
              선수 기록 조회 페이지
            </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            타자와 투수 기록을
            <br className="hidden sm:block" />한 페이지에서 빠르게 확인합니다.
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/80 sm:text-base">
            팀/경기 기록 입력과 연동되어 관리자가 입력한 선수 성적이 즉시 반영됩니다.
          </p>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-[28px] bg-white/10 p-3 backdrop-blur sm:min-w-[320px]">
            <div className="rounded-2xl bg-white/12 p-4">
              <p className="text-xs text-white/70">타자 기록</p>
              <strong className="mt-2 block text-2xl">{displayHitters.length}</strong>
            </div>
            <div className="rounded-2xl bg-white/12 p-4">
              <p className="text-xs text-white/70">투수 기록</p>
              <strong className="mt-2 block text-2xl">{displayPitchers.length}</strong>
            </div>
            <div className="rounded-2xl bg-white/12 p-4">
              <p className="text-xs text-white/70">팀 필터</p>
              <strong className="mt-2 block text-2xl">{playerTeams.length}</strong>
            </div>
          </div>
        </div>
      </section>

      <SectionCard
        title="선수 기록"
        subtitle="기본 수치는 mock 기반 + 관리자 입력 경기 기록 누적값으로 함께 표시합니다."
      >
        <PlayersPageClient
          hitters={displayHitters}
          pitchers={displayPitchers}
          teams={playerTeams}
        />
      </SectionCard>
    </main>
  );
}
