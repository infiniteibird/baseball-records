"use client";

import { useMemo, useState } from "react";
import { SectionCard } from "@/components/section-card";
import {
  buildBatterMVPRankings,
  buildPitcherMVPRankings,
} from "@/lib/record-mvp-rankings";
import { useBaseballData } from "@/store/baseball-context";

type RankingTab = "batters" | "pitchers";

export default function RankingPage() {
  const { state } = useBaseballData();
  const [activeTab, setActiveTab] = useState<RankingTab>("batters");

  const teamNameMap = useMemo(
    () => new Map(state.teams.map((team) => [team.id, team.name] as const)),
    [state.teams],
  );

  const batterRankings = useMemo(
    () => buildBatterMVPRankings(state.games, state.records, teamNameMap),
    [state.games, state.records, teamNameMap],
  );
  const pitcherRankings = useMemo(
    () => buildPitcherMVPRankings(state.games, state.records, teamNameMap),
    [state.games, state.records, teamNameMap],
  );

  const topThree = batterRankings.slice(0, 3);
  const topPitchers = pitcherRankings.slice(0, 3);
  const currentCount =
    activeTab === "batters" ? batterRankings.length : pitcherRankings.length;
  const currentTopScore =
    activeTab === "batters"
      ? topThree[0]?.score ?? 0
      : topPitchers[0]?.score ?? 0;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#5d1f15_0%,#8f3d20_50%,#d97706_100%)] px-5 py-6 text-white shadow-[0_20px_50px_rgba(124,45,18,0.24)] sm:px-8 sm:py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-white/75">
              한잔더 랭킹
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              타자와 투수 MVP 점수를
              <br className="hidden sm:block" />실제 기록 기준으로 정렬합니다.
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/80 sm:text-base">
              실제 경기 기록을 바탕으로 타자와 투수 점수를 계산해 한 페이지에서
              비교할 수 있습니다.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-[28px] bg-white/10 p-3 backdrop-blur sm:min-w-[280px]">
            <div className="rounded-2xl bg-white/12 p-4">
              <p className="text-xs text-white/70">랭킹 선수 수</p>
              <strong className="mt-2 block text-2xl">
                {currentCount}
              </strong>
            </div>
            <div className="rounded-2xl bg-white/12 p-4">
              <p className="text-xs text-white/70">현재 1위 점수</p>
              <strong className="mt-2 block text-2xl">
                {formatRankingScore(currentTopScore)}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <SectionCard
        title="랭킹 선택"
        subtitle="타자 MVP와 투수 MVP를 전환해 확인합니다."
      >
        <div className="inline-flex flex-wrap gap-2 rounded-[24px] bg-soft p-2">
          {[
            { key: "batters", label: "타자 MVP 랭킹" },
            { key: "pitchers", label: "투수 MVP 랭킹" },
          ].map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as RankingTab)}
                className={
                  isActive
                    ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(19,60,115,0.18)]"
                    : "rounded-full px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-primary"
                }
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </SectionCard>

      {activeTab === "batters" ? (
        <>
          <SectionCard
            title="타자 MVP TOP 3"
            subtitle="현재 저장된 경기 기록을 기준으로 점수 높은 순서대로 표시합니다."
          >
            {topThree.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {topThree.map((player) => (
                  <article
                    key={`${player.team}-${player.player}`}
                    className="rounded-3xl border border-line bg-soft p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
                        {player.rank}
                      </span>
                      <strong className="text-2xl font-bold text-accent">
                        {formatRankingScore(player.score)}
                      </strong>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-foreground">
                      {player.player}
                    </h3>
                    <p className="mt-1 text-sm text-muted">{player.team}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <Metric label="타석" value={player.pa} />
                      <Metric label="안타" value={player.singles + player.doubles + player.triples + player.homeRuns} />
                      <Metric label="홈런" value={player.homeRuns} />
                      <Metric label="타점" value={player.rbi} />
                      <Metric label="득점" value={player.runs} />
                      <Metric label="도루" value={player.steals} />
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState message="아직 집계할 타자 기록이 없습니다. 경기 기록을 저장하면 자동으로 반영됩니다." />
            )}
          </SectionCard>

          <SectionCard
            title="타자 MVP 랭킹"
            subtitle="점수 공식: 타석 1, 1루타 10, 2루타 20, 3루타 30, 홈런 50, 득점 5, 타점 10, 볼넷 5, 고의4구 10, 희생타 5, 아웃 -5, 삼진 -10, 주루사 -5, 병살타 -10, 도루 10, 도루자 -5"
          >
            {batterRankings.length > 0 ? (
              <div className="overflow-x-auto rounded-3xl border border-line bg-card">
                <div className="min-w-[1624px]">
                  <div className="grid grid-cols-[56px_140px_120px_90px_repeat(16,72px)] bg-soft px-5 py-3 text-xs font-semibold text-muted">
                    <span>순위</span>
                    <span>선수명</span>
                    <span>팀명</span>
                    <span className="text-right">MVP 점수</span>
                    <span className="text-right">타석</span>
                    <span className="text-right">1루타</span>
                    <span className="text-right">2루타</span>
                    <span className="text-right">3루타</span>
                    <span className="text-right">홈런</span>
                    <span className="text-right">득점</span>
                    <span className="text-right">타점</span>
                    <span className="text-right">볼넷</span>
                    <span className="text-right">고의4구</span>
                    <span className="text-right">희생타</span>
                    <span className="text-right">아웃</span>
                    <span className="text-right">삼진</span>
                    <span className="text-right">주루사</span>
                    <span className="text-right">병살타</span>
                    <span className="text-right">도루</span>
                    <span className="text-right">도루자</span>
                  </div>
                  <div className="divide-y divide-line">
                    {batterRankings.map((player) => (
                      <div
                        key={`${player.team}-${player.player}`}
                        className="grid grid-cols-[56px_140px_120px_90px_repeat(16,72px)] items-center px-5 py-4 text-sm"
                      >
                        <span className="font-bold text-primary">{player.rank}</span>
                        <span className="font-medium text-foreground">
                          {player.player}
                        </span>
                        <span className="text-muted">{player.team}</span>
                        <span className="text-right font-semibold text-accent">
                          {formatRankingScore(player.score)}
                        </span>
                        <span className="text-right text-foreground">{player.pa}</span>
                        <span className="text-right text-foreground">{player.singles}</span>
                        <span className="text-right text-foreground">{player.doubles}</span>
                        <span className="text-right text-foreground">{player.triples}</span>
                        <span className="text-right text-foreground">{player.homeRuns}</span>
                        <span className="text-right text-foreground">{player.runs}</span>
                        <span className="text-right text-foreground">{player.rbi}</span>
                        <span className="text-right text-foreground">{player.walks}</span>
                        <span className="text-right text-foreground">{player.intentionalWalks}</span>
                        <span className="text-right text-foreground">{player.sacrificeHits}</span>
                        <span className="text-right text-foreground">{player.outs}</span>
                        <span className="text-right text-foreground">{player.strikeouts}</span>
                        <span className="text-right text-foreground">{player.baserunningOuts}</span>
                        <span className="text-right text-foreground">{player.doublePlays}</span>
                        <span className="text-right text-foreground">{player.steals}</span>
                        <span className="text-right text-foreground">{player.caughtStealing}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState message="아직 집계할 타자 기록이 없습니다. 경기 기록을 저장하면 자동으로 반영됩니다." />
            )}
          </SectionCard>
        </>
      ) : (
        <>
          <SectionCard
            title="투수 MVP TOP 3"
            subtitle="현재 저장된 경기 기록을 기준으로 점수 높은 순서대로 표시합니다."
          >
            {topPitchers.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {topPitchers.map((player) => (
                  <article
                    key={`${player.team}-${player.player}`}
                    className="rounded-3xl border border-line bg-soft p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
                        {player.rank}
                      </span>
                      <strong className="text-2xl font-bold text-accent">
                        {formatRankingScore(player.score)}
                      </strong>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-foreground">
                      {player.player}
                    </h3>
                    <p className="mt-1 text-sm text-muted">{player.team}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <Metric label="이닝" value={player.ip} />
                      <Metric label="승" value={player.wins} />
                      <Metric label="세이브" value={player.saves} />
                      <Metric label="탈삼진" value={player.strikeouts} />
                      <Metric label="실점" value={player.runs} />
                      <Metric label="자책점" value={player.earnedRuns} />
                      <Metric label="완투" value={player.completeGames} />
                      <Metric label="완봉" value={player.shutouts} />
                      <Metric label="노히트노런" value={player.noHitters} />
                      <Metric label="퍼펙트" value={player.perfectGames} />
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState message="아직 집계할 투수 기록이 없습니다. 경기 기록을 저장하면 자동으로 반영됩니다." />
            )}
          </SectionCard>

          <SectionCard
            title="투수 MVP 랭킹"
            subtitle="점수 공식: 이닝 12, 승리 100, 패전 -25, 세이브 50, 탈삼진 10, 피안타 -7, 피홈런 -10, 볼넷 -5, 사구 -7, 보크 -5, 자책점 -10, 비자책 실점 -5, 완봉 50, 완투 25, 노히트노런 100, 퍼펙트게임 200"
          >
            {pitcherRankings.length > 0 ? (
              <div className="overflow-x-auto rounded-3xl border border-line bg-card">
                <div className="min-w-[1696px]">
                  <div className="grid grid-cols-[56px_140px_120px_90px_repeat(17,72px)] bg-soft px-5 py-3 text-xs font-semibold text-muted">
                    <span>순위</span>
                    <span>선수명</span>
                    <span>팀명</span>
                    <span className="text-right">MVP 점수</span>
                    <span className="text-right">이닝</span>
                    <span className="text-right">승</span>
                    <span className="text-right">패</span>
                    <span className="text-right">세이브</span>
                    <span className="text-right">탈삼진</span>
                    <span className="text-right">피안타</span>
                    <span className="text-right">피홈런</span>
                    <span className="text-right">볼넷</span>
                    <span className="text-right">사구</span>
                    <span className="text-right">보크</span>
                    <span className="text-right">실점</span>
                    <span className="text-right">자책점</span>
                    <span className="text-right">완투</span>
                    <span className="text-right">완봉</span>
                    <span className="text-right">노히트노런</span>
                    <span className="text-right">퍼펙트게임</span>
                    <span className="text-right">ERA</span>
                  </div>
                  <div className="divide-y divide-line">
                    {pitcherRankings.map((player) => (
                      <div
                        key={`${player.team}-${player.player}`}
                        className="grid grid-cols-[56px_140px_120px_90px_repeat(17,72px)] items-center px-5 py-4 text-sm"
                      >
                        <span className="font-bold text-primary">{player.rank}</span>
                        <span className="font-medium text-foreground">
                          {player.player}
                        </span>
                        <span className="text-muted">{player.team}</span>
                        <span className="text-right font-semibold text-accent">
                          {formatRankingScore(player.score)}
                        </span>
                        <span className="text-right text-foreground">{player.ip}</span>
                        <span className="text-right text-foreground">{player.wins}</span>
                        <span className="text-right text-foreground">{player.losses}</span>
                        <span className="text-right text-foreground">{player.saves}</span>
                        <span className="text-right text-foreground">{player.strikeouts}</span>
                        <span className="text-right text-foreground">{player.hitsAllowed}</span>
                        <span className="text-right text-foreground">{player.homeRunsAllowed}</span>
                        <span className="text-right text-foreground">{player.walks}</span>
                        <span className="text-right text-foreground">{player.hbp}</span>
                        <span className="text-right text-foreground">{player.balks}</span>
                        <span className="text-right text-foreground">{player.runs}</span>
                        <span className="text-right text-foreground">{player.earnedRuns}</span>
                        <span className="text-right text-foreground">{player.completeGames}</span>
                        <span className="text-right text-foreground">{player.shutouts}</span>
                        <span className="text-right text-foreground">{player.noHitters}</span>
                        <span className="text-right text-foreground">{player.perfectGames}</span>
                        <span className="text-right text-foreground">
                          {formatPitcherEra(player)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState message="아직 집계할 투수 기록이 없습니다. 경기 기록을 저장하면 자동으로 반영됩니다." />
            )}
          </SectionCard>
        </>
      )}
    </main>
  );
}

function Metric({
  label,
  value,
}: Readonly<{
  label: string;
  value: number | string;
}>) {
  return (
    <div className="rounded-2xl bg-card px-3 py-3 text-center">
      <p className="text-[11px] font-semibold text-muted">{label}</p>
      <p className="mt-1 text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function EmptyState({ message }: Readonly<{ message: string }>) {
  return (
    <div className="rounded-[28px] border border-dashed border-line bg-card px-5 py-10 text-center text-sm text-muted">
      {message}
    </div>
  );
}

function formatPitcherEra(player: {
  outs: number;
  earnedRuns: number;
}) {
  if (player.outs === 0) {
    return "0.00";
  }

  const innings = player.outs / 3;
  return ((player.earnedRuns * 9) / innings).toFixed(2);
}

function formatRankingScore(score: number) {
  return Number.isInteger(score) ? score.toString() : score.toFixed(2);
}
