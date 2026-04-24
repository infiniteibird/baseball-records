"use client";

import { useMemo, useState } from "react";
import { SectionCard } from "@/components/section-card";
import { seasonOptions } from "@/data/mock-teams";
import { calculateStandings, useBaseballData } from "@/store/baseball-context";

export default function StandingsPage() {
  const { standings, state } = useBaseballData();
  const [selectedSeason, setSelectedSeason] = useState(seasonOptions[0]);

  const displayedStandings = useMemo(() => {
    const seasonYear = getSeasonYear(selectedSeason);

    if (!seasonYear) {
      return standings;
    }

    return calculateStandings(state.games, state.teams, state.records, {
      season: seasonYear,
    });
  }, [selectedSeason, state.games, state.teams, state.records, standings]);

  function renderRateCell(
    numerator: number,
    innings: string,
    rate: number,
  ) {
    return `${rate.toFixed(3)} (${numerator}/${innings})`;
  }

  function renderOnBaseRate(
    onBase: number,
    plateAppearances: number,
    rate: number,
  ) {
    return `${rate.toFixed(3)} (${onBase}/${plateAppearances})`;
  }

  function getSeasonYear(label: string) {
    const match = label.match(/(20\d{2})/);

    return match ? Number(match[1]) : undefined;
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#133c73_0%,#24579f_58%,#4f8fe2_100%)] px-5 py-6 text-white shadow-[0_20px_50px_rgba(19,60,115,0.24)] sm:px-8 sm:py-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-white/75">
              경기 데이터 기반 팀 순위
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              종료된 경기 결과를 기준으로
              <br className="hidden sm:block" />팀 순위를 자동 계산합니다.
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/80 sm:text-base">
              관리자 페이지에서 추가한 종료 경기까지 포함해 경기수, 승패무, 승점,
              승률, 실점율(총 실점/수비 이닝), 득점율(총 득점/공격 이닝),
              출루율(총 출루/총 타석)을 다시 계산합니다.
            </p>
          </div>

          <div className="w-full max-w-sm rounded-[28px] bg-white/10 p-4 backdrop-blur">
            <p className="text-xs font-semibold text-white/70">시즌 선택</p>
            <label className="mt-2">
              <span className="sr-only">시즌 선택</span>
              <select
                value={selectedSeason}
                onChange={(event) => setSelectedSeason(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/20 bg-white/12 px-4 py-3 text-left text-sm text-white"
              >
                {seasonOptions.map((season) => (
                  <option
                    key={season}
                    value={season}
                    className="bg-white text-foreground"
                  >
                    {season}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <SectionCard
          title="팀 순위"
          subtitle="종료된 경기 기준 자동 계산 결과입니다."
        >
          <div className="overflow-x-auto pb-2">
            <div className="inline-block min-w-full pr-6 align-top">
              <div className="w-max min-w-full overflow-hidden rounded-2xl border border-line">
                <div className="grid grid-cols-[52px_120px_56px_44px_44px_44px_56px_68px_144px_144px_156px] items-center gap-x-2 bg-soft px-4 py-3 text-xs font-semibold text-muted">
                <span>순위</span>
                <span>팀명</span>
                <span className="text-right">경기</span>
                <span className="text-right">승</span>
                <span className="text-right">패</span>
                <span className="text-right">무</span>
                <span className="text-right">승점</span>
                <span className="text-right">승률</span>
                <span className="text-right">실점/이닝</span>
                <span className="text-right">득점/이닝</span>
                <span className="text-right">출루/타석</span>
                </div>
                <div className="divide-y divide-line bg-card">
                  {displayedStandings.map((team) => (
                    <div
                      key={team.team}
                      className="grid grid-cols-[52px_120px_56px_44px_44px_44px_56px_68px_144px_144px_156px] items-center gap-x-2 px-4 py-3 text-xs"
                    >
                      <span className="font-bold text-primary">{team.rank}</span>
                      <span className="truncate font-semibold text-foreground">
                        {team.team}
                      </span>
                      <span className="text-right text-muted">{team.games}</span>
                      <span className="text-right font-semibold text-foreground">
                        {team.wins}
                      </span>
                      <span className="text-right text-muted">{team.losses}</span>
                      <span className="text-right text-muted">{team.draws}</span>
                      <span className="text-right font-semibold text-accent">
                        {team.points}
                      </span>
                      <span className="text-right font-semibold text-primary">
                        {team.winRate}
                      </span>
                      <span className="text-right tabular-nums text-foreground">
                        {renderRateCell(
                          team.runsAgainst,
                          team.defenseInnings,
                          team.runAllowedRate,
                        )}
                      </span>
                      <span className="text-right tabular-nums text-foreground">
                        {renderRateCell(team.runsFor, team.offenseInnings, team.scoringRate)}
                      </span>
                      <span className="text-right tabular-nums text-foreground">
                        {renderOnBaseRate(
                          team.onBase,
                          team.plateAppearances,
                          team.onBaseRate,
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="계산 기준"
          subtitle="현재 순위 계산 규칙입니다."
        >
          <div className="space-y-3">
            <article className="rounded-3xl bg-soft p-4">
              <h3 className="text-sm font-semibold text-foreground">승점</h3>
              <p className="mt-1 text-sm leading-6 text-muted">
                승 3점, 무 1점, 패 0점
              </p>
            </article>
            <article className="rounded-3xl bg-soft p-4">
              <h3 className="text-sm font-semibold text-foreground">승률</h3>
              <p className="mt-1 text-sm leading-6 text-muted">
                승 ÷ (승 + 패)
              </p>
            </article>
            <article className="rounded-3xl bg-soft p-4">
              <h3 className="text-sm font-semibold text-foreground">정렬</h3>
              <p className="mt-1 text-sm leading-6 text-muted">
                승점 &gt; 실점율 &gt; 득점율 &gt; 출루율 순으로 정렬
              </p>
            </article>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
