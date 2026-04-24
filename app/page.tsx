"use client";

import { SectionCard } from "@/components/section-card";
import type { HitterStatsRow, PlayerRecord, PitcherStatsRow } from "@/data/types";
import { useBaseballData } from "@/store/baseball-context";
import { useMemo } from "react";

function LeaderList({
  title,
  leaders,
}: Readonly<{
  title: string;
  leaders: {
    rank: number;
    player: string;
    team: string;
    stat: string;
  }[];
}>) {
  return (
    <div className="rounded-3xl bg-soft p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted">TOP 3</span>
      </div>
      <div className="space-y-3">
        {leaders.map((leader) => (
          <div
            key={`${title}-${leader.player}`}
            className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {leader.rank}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {leader.player}
                </p>
                <p className="text-xs text-muted">{leader.team}</p>
              </div>
            </div>
            <strong className="text-sm text-accent">{leader.stat}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const {
    todayGames,
    recentResults,
    standings,
    displayHitters,
    displayPitchers,
  } = useBaseballData();
  const standingsSummary = standings.slice(0, 5);
  const hitterLeaders = useMemo(
    () => buildTopHitterLeaders(displayHitters),
    [displayHitters],
  );
  const pitcherLeaders = useMemo(
    () => buildTopPitcherLeaders(displayPitchers),
    [displayPitchers],
  );

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#133c73_0%,#24579f_58%,#4f8fe2_100%)] px-5 py-6 text-white shadow-[0_20px_50px_rgba(19,60,115,0.24)] sm:px-8 sm:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-white/75">
              기록 조회 중심 홈 프로토타입
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              오늘 경기와 핵심 기록을
              <br className="hidden sm:block" />첫 화면에서 바로 확인합니다.
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/80 sm:text-base">
              관리자 페이지에서 추가한 경기 정보도 이 화면에 즉시 반영됩니다.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-[28px] bg-white/10 p-3 backdrop-blur sm:min-w-[320px]">
            <div className="rounded-2xl bg-white/12 p-4">
              <p className="text-xs text-white/70">오늘 경기</p>
              <strong className="mt-2 block text-2xl">{todayGames.length}</strong>
            </div>
            <div className="rounded-2xl bg-white/12 p-4">
              <p className="text-xs text-white/70">최근 경기</p>
              <strong className="mt-2 block text-2xl">{recentResults.length}</strong>
            </div>
            <div className="rounded-2xl bg-white/12 p-4">
              <p className="text-xs text-white/70">순위 팀수</p>
              <strong className="mt-2 block text-2xl">{standings.length}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <SectionCard
            title="예정 경기"
            subtitle="공통 상태에 등록된 예정 경기를 바로 확인합니다."
          >
            <div className="space-y-3">
              {todayGames.map((game) => (
                <article
                  key={`${game.home}-${game.away}-${game.time}`}
                  className="rounded-3xl border border-line bg-soft p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted">
                      <span>{game.league}</span>
                      <span className="h-1 w-1 rounded-full bg-line" />
                      <span>{game.stadium}</span>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary">
                      {game.status}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted">원정</p>
                      <p className="truncate text-xl font-bold text-foreground">
                        {game.away}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-accent">
                        {game.time}
                      </p>
                      <p className="text-xs text-muted">VS</p>
                    </div>
                    <div className="min-w-0 text-right">
                      <p className="text-xs text-muted">홈</p>
                      <p className="truncate text-xl font-bold text-foreground">
                        {game.home}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-5">
          <SectionCard
            title="최근 경기 결과"
            subtitle="종료된 경기 중 최근 입력/최근 등록 순으로 보여줍니다."
          >
            <div className="space-y-3">
              {recentResults.map((game) => (
                <article
                  key={`${game.date}-${game.home}-${game.away}`}
                  className="rounded-3xl border border-line bg-card px-4 py-4"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-muted">
                    <span>{game.date}</span>
                    <span>{game.note}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <p className="text-sm font-semibold text-foreground">
                      {game.away}
                    </p>
                    <p className="text-lg font-bold text-accent">{game.score}</p>
                    <p className="text-right text-sm font-semibold text-foreground">
                      {game.home}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-5">
          <SectionCard
            title="팀 순위 요약"
            subtitle="경기 데이터 기준으로 자동 계산된 상위 팀입니다."
          >
            <div className="overflow-hidden rounded-3xl border border-line">
              <div className="grid grid-cols-[48px_1fr_48px_48px_48px_64px] bg-soft px-4 py-3 text-xs font-semibold text-muted">
                <span>순위</span>
                <span>팀</span>
                <span className="text-right">승</span>
                <span className="text-right">패</span>
                <span className="text-right">무</span>
                <span className="text-right">실점</span>
              </div>
              <div className="divide-y divide-line bg-card">
                {standingsSummary.map((team) => (
                  <div
                    key={team.team}
                    className="grid grid-cols-[48px_1fr_48px_48px_48px_64px] items-center px-4 py-3 text-sm"
                  >
                    <span className="font-bold text-primary">{team.rank}</span>
                    <span className="font-semibold text-foreground">
                      {team.team}
                    </span>
                    <span className="text-right font-semibold text-foreground">
                      {team.wins}
                    </span>
                    <span className="text-right text-muted">{team.losses}</span>
                    <span className="text-right text-muted">{team.draws}</span>
                    <span className="text-right text-accent">
                      {team.runsAgainst}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-7">
          <SectionCard
            title="타자 / 투수 TOP 기록"
            subtitle="선수 기록은 현재 mock 유지, 팀명만 공통 상태 기준으로 표시됩니다."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <LeaderList title="타자 TOP (타율)" leaders={hitterLeaders} />
              <LeaderList title="투수 TOP (ERA)" leaders={pitcherLeaders} />
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}

function buildTopHitterLeaders(hitters: HitterStatsRow[]) {
  const sorted = [...hitters].sort((a, b) => {
    const avgA = parseRate(a.avg);
    const avgB = parseRate(b.avg);

    if (avgB !== avgA) {
      return avgB - avgA;
    }

    if (a.team !== b.team) {
      return a.team.localeCompare(b.team, "ko");
    }

    return a.player.localeCompare(b.player, "ko");
  });

  return sorted.slice(0, 3).map((player, index) => ({
    rank: index + 1,
    player: player.player,
    team: player.team,
    stat: `타율 ${player.avg}`,
  })) satisfies PlayerRecord[];
}

function buildTopPitcherLeaders(pitchers: PitcherStatsRow[]) {
  const sorted = [...pitchers].sort((a, b) => {
    const eraA = parseRate(a.era);
    const eraB = parseRate(b.era);

    if (eraA !== eraB) {
      return eraA - eraB;
    }

    if (a.team !== b.team) {
      return a.team.localeCompare(b.team, "ko");
    }

    return a.player.localeCompare(b.player, "ko");
  });

  return sorted.slice(0, 3).map((player, index) => ({
    rank: index + 1,
    player: player.player,
    team: player.team,
    stat: `ERA ${player.era}`,
  })) satisfies PlayerRecord[];
}

function parseRate(value: string) {
  const parsed = Number.parseFloat(value);

  return Number.isNaN(parsed) ? 0 : parsed;
}
