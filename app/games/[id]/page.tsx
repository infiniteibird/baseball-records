"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { SectionCard } from "@/components/section-card";
import type { DisplayGame } from "@/data/types";
import { getGameDetailById } from "@/data/mock-games";
import { useBaseballData } from "@/store/baseball-context";

export default function GameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { getRecordDetailByGameId, isHydrated, recentGames, upcomingGames } =
    useBaseballData();
  const { id } = use(params);
  const recordGame = getRecordDetailByGameId(id);
  const fallbackGame = findGameFromLists(id, [...recentGames, ...upcomingGames]);
  const game =
    recordGame ??
    getGameDetailById(id) ??
    (fallbackGame ? createEmptyDetailFromDisplayGame(fallbackGame) : null);

  if (!isHydrated && !game) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <SectionCard title="경기 상세" subtitle="경기 기록을 불러오는 중입니다.">
          <div className="rounded-3xl bg-soft p-6 text-sm text-muted">
            저장된 상세 기록과 경기 정보를 확인하고 있습니다.
          </div>
        </SectionCard>
      </main>
    );
  }

  if (!game) {
    notFound();
  }

  const awayBatters = game.battingStats.filter((player) => player.team === "away");
  const homeBatters = game.battingStats.filter((player) => player.team === "home");
  const awayPitchers = game.pitchingStats.filter((player) => player.team === "away");
  const homePitchers = game.pitchingStats.filter((player) => player.team === "home");

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <SectionCard
        title="경기 상세"
        subtitle="스코어보드와 요약 기록, 타자/투수 기록을 한 페이지에 정리했습니다."
      >
        <div className="space-y-5">
          <section className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#113768_0%,#1e4f93_55%,#5a92e4_100%)] p-5 text-white shadow-[0_20px_50px_rgba(19,60,115,0.24)] sm:p-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-white/70">
                  <span className="rounded-full bg-white/12 px-3 py-1 text-white">
                    {game.status}
                  </span>
                  <span>{game.date}</span>
                  <span className="h-1 w-1 rounded-full bg-white/40" />
                  <span>{game.time}</span>
                  <span className="h-1 w-1 rounded-full bg-white/40" />
                  <span>{game.stadium}</span>
                </div>
                <p className="text-sm text-white/75">{game.note}</p>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[28px] bg-white/10 p-4 sm:p-6">
                <TeamScoreBlock team={game.awayTeam} side="원정" />
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
                    Score
                  </p>
                  <p className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
                    {displayScore(game.awayScore)} : {displayScore(game.homeScore)}
                  </p>
                </div>
                <TeamScoreBlock team={game.homeTeam} side="홈" align="right" />
              </div>

              <div className="overflow-x-auto rounded-[28px] bg-white p-4 text-foreground">
                <div className="min-w-[760px] overflow-hidden rounded-2xl border border-line">
                  <div className="grid grid-cols-[88px_repeat(9,1fr)_44px_44px_44px_44px] bg-soft px-3 py-3 text-center text-xs font-semibold text-muted">
                    <span className="text-left">팀 / 이닝</span>
                    {game.lineScore.innings.map((inning) => (
                      <span key={`${game.id}-inning-${inning}`}>{inning}</span>
                    ))}
                    <span>R</span>
                    <span>H</span>
                    <span>E</span>
                    <span>B</span>
                  </div>
                  <div className="grid grid-cols-[88px_repeat(9,1fr)_44px_44px_44px_44px] items-center border-t border-line px-3 py-3 text-center text-sm">
                    <span className="text-left font-semibold text-foreground">
                      {game.awayTeam}
                    </span>
                    {game.lineScore.awayRuns.map((run, index) => (
                      <span key={`${game.id}-away-${index}`}>{run}</span>
                    ))}
                    <span className="font-semibold text-primary">
                      {game.lineScore.awayTotals.R}
                    </span>
                    <span>{game.lineScore.awayTotals.H}</span>
                    <span>{game.lineScore.awayTotals.E}</span>
                    <span>{game.lineScore.awayTotals.B}</span>
                  </div>
                  <div className="grid grid-cols-[88px_repeat(9,1fr)_44px_44px_44px_44px] items-center border-t border-line px-3 py-3 text-center text-sm">
                    <span className="text-left font-semibold text-foreground">
                      {game.homeTeam}
                    </span>
                    {game.lineScore.homeRuns.map((run, index) => (
                      <span key={`${game.id}-home-${index}`}>{run}</span>
                    ))}
                    <span className="font-semibold text-primary">
                      {game.lineScore.homeTotals.R}
                    </span>
                    <span>{game.lineScore.homeTotals.H}</span>
                    <span>{game.lineScore.homeTotals.E}</span>
                    <span>{game.lineScore.homeTotals.B}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <SectionCard
              title="팀 비교 요약"
              subtitle="안타, 홈런, 도루 등 주요 지표를 좌우 비교 바 형태로 정리했습니다."
            >
              <div className="space-y-4">
                {game.teamStatsComparison.map((stat) => (
                  <ComparisonBar
                    key={`${game.id}-${stat.label}`}
                    label={stat.label}
                    away={stat.away}
                    home={stat.home}
                    awayTeam={game.awayTeam}
                    homeTeam={game.homeTeam}
                  />
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="경기 요약"
              subtitle="결승타와 주요 상황을 카드형으로 정리했습니다."
            >
              <div className="space-y-3">
                <SummaryRow label="결승타" value={game.summary.decisiveHit} />
                <SummaryRow label="홈런" value={game.summary.homeRuns} />
                <SummaryRow label="2루타" value={game.summary.doubles} />
                <SummaryRow label="도루" value={game.summary.steals} />
                <SummaryRow label="도루자" value={game.summary.caughtStealing} />
                <SummaryRow label="주루사" value={game.summary.baserunningOuts} />
                <SummaryRow label="견제사" value={game.summary.pickoffs} />
                <SummaryRow label="포일" value={game.summary.passedBalls} />
                <SummaryRow label="심판" value={game.summary.umpires} />
              </div>
            </SectionCard>
          </section>

          <section className="grid grid-cols-1 gap-5">
            <SectionCard
              title="타자 기록"
              subtitle="원정팀과 홈팀 타자 기록을 표로 정리했습니다."
            >
              <div className="space-y-5">
                <StatsTableTitle team={game.awayTeam} />
                <BattingTable rows={awayBatters} />
                <StatsTableTitle team={game.homeTeam} />
                <BattingTable rows={homeBatters} />
              </div>
            </SectionCard>

            <SectionCard
              title="투수 기록"
              subtitle="투수별 소화 이닝과 실점, 투구 수를 함께 확인할 수 있습니다."
            >
              <div className="space-y-5">
                <StatsTableTitle team={game.awayTeam} />
                <PitchingTable rows={awayPitchers} />
                <StatsTableTitle team={game.homeTeam} />
                <PitchingTable rows={homePitchers} />
              </div>
            </SectionCard>
          </section>
        </div>
      </SectionCard>
    </main>
  );
}

function findGameFromLists(id: string, games: DisplayGame[]): DisplayGame | null {
  return games.find((item) => item.id === id) ?? null;
}

function createEmptyDetailFromDisplayGame(game: DisplayGame) {
  const innings = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return {
    id: game.id,
    date: game.date,
    time: game.time,
    stadium: game.stadium,
    status: game.status,
    awayTeam: game.awayTeam,
    homeTeam: game.homeTeam,
    awayScore: game.awayScore,
    homeScore: game.homeScore,
    note:
      game.detailAvailable
        ? "상세 기록이 아직 비어 있습니다. 기록 입력 페이지에서 상세를 입력해 주세요."
        : "아직 상세 기록이 입력되지 않은 예정 경기입니다.",
    lineScore: {
      innings,
      awayRuns: Array(9).fill(""),
      homeRuns: Array(9).fill(""),
      awayTotals: {
        R: game.awayScore === null ? "0" : String(game.awayScore),
        H: "0",
        E: "0",
        B: "0",
      },
      homeTotals: {
        R: game.homeScore === null ? "0" : String(game.homeScore),
        H: "0",
        E: "0",
        B: "0",
      },
    },
    teamStatsComparison: [
      { label: "안타", away: 0, home: 0 },
      { label: "홈런", away: 0, home: 0 },
      { label: "도루", away: 0, home: 0 },
      { label: "삼진", away: 0, home: 0 },
      { label: "병살", away: 0, home: 0 },
      { label: "실책", away: 0, home: 0 },
    ],
    summary: {
      decisiveHit: "상세 기록 입력 대기",
      homeRuns: "상세 기록 입력 대기",
      doubles: "상세 기록 입력 대기",
      steals: "상세 기록 입력 대기",
      caughtStealing: "상세 기록 입력 대기",
      baserunningOuts: "상세 기록 입력 대기",
      pickoffs: "상세 기록 입력 대기",
      passedBalls: "상세 기록 입력 대기",
      umpires: "상세 기록 입력 대기",
    },
    battingStats: [],
    pitchingStats: [],
  };
}

function TeamScoreBlock({
  team,
  side,
  align = "left",
}: Readonly<{
  team: string;
  side: string;
  align?: "left" | "right";
}>) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <div
        className={`mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/12 text-sm font-bold ${
          align === "right" ? "ml-auto" : ""
        }`}
      >
        {team.slice(0, 2)}
      </div>
      <p className="text-xs font-semibold text-white/70">{side}</p>
      <p className="mt-1 text-2xl font-bold">{team}</p>
    </div>
  );
}

function ComparisonBar({
  label,
  away,
  home,
  awayTeam,
  homeTeam,
}: Readonly<{
  label: string;
  away: number;
  home: number;
  awayTeam: string;
  homeTeam: string;
}>) {
  const scaleMax = Math.max(17, away, home);
  const awayWidth = (away / scaleMax) * 100;
  const homeWidth = (home / scaleMax) * 100;

  return (
    <div className="rounded-3xl bg-soft p-4">
      <div className="flex items-center justify-between text-xs font-semibold text-muted">
        <span>{awayTeam}</span>
        <span>{homeTeam}</span>
      </div>
      <div className="mt-2 flex items-center justify-center gap-3 text-sm font-semibold text-foreground">
        <span className="min-w-8 text-right text-primary">{away}</span>
        <span className="text-muted">{label}</span>
        <span className="min-w-8 text-left text-accent">{home}</span>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="h-3 overflow-hidden rounded-full bg-white">
          <div
            className="ml-auto h-full rounded-full bg-primary"
            style={{ width: `${awayWidth}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-muted">VS</span>
        <div className="h-3 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${homeWidth}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="rounded-3xl bg-soft p-4">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <div className="mt-2 text-sm leading-6 text-foreground">
        <SummaryValue value={value} emphasize={label !== "심판"} />
      </div>
    </div>
  );
}

function SummaryValue({
  value,
  emphasize,
}: Readonly<{
  value: string;
  emphasize: boolean;
}>) {
  if (!emphasize || !value.includes("(") || !value.includes(")")) {
    return <p>{value}</p>;
  }

  const parts = value.split(",").map((part) => part.trim());

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {parts.map((part) => {
        const matched = part.match(/^(.+?)(\(.+\))$/);

        if (!matched) {
          return (
            <span key={part} className="text-foreground">
              {part}
            </span>
          );
        }

        const [, name, inning] = matched;

        return (
          <span key={part}>
            <strong className="font-semibold text-foreground">{name}</strong>
            <span className="font-normal text-muted">{inning}</span>
          </span>
        );
      })}
    </div>
  );
}

function StatsTableTitle({ team }: Readonly<{ team: string }>) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-soft text-sm font-bold text-primary">
        {team.slice(0, 2)}
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{team}</p>
        <p className="text-xs text-muted">팀 기록</p>
      </div>
    </div>
  );
}

function BattingTable({
  rows,
}: Readonly<{
  rows: Array<{
    name: string;
    ab: number;
    runs: number;
    hits: number;
    rbi: number;
    hr: number;
    bb: number;
    so: number;
    sb: number;
    avg: string;
    plateAppearancesByInning: string[];
  }>;
}>) {
  const totals = rows.reduce(
    (accumulator, row) => {
      accumulator.ab += row.ab;
      accumulator.runs += row.runs;
      accumulator.hits += row.hits;
      accumulator.rbi += row.rbi;
      accumulator.hr += row.hr;
      accumulator.bb += row.bb;
      accumulator.so += row.so;
      accumulator.sb += row.sb;
      return accumulator;
    },
    { ab: 0, runs: 0, hits: 0, rbi: 0, hr: 0, bb: 0, so: 0, sb: 0 },
  );

  return (
    <div className="overflow-x-auto rounded-3xl border border-line">
      <div className="min-w-[1220px]">
        <div className="grid grid-cols-[140px_56px_56px_56px_56px_56px_56px_56px_56px_70px_432px] bg-[#e4ebf5] px-4 py-0 text-xs font-semibold text-muted">
          <span>타자명</span>
          <span className="py-3 text-right">타수</span>
          <span className="py-3 text-right">득점</span>
          <span className="py-3 text-right">안타</span>
          <span className="py-3 text-right">타점</span>
          <span className="py-3 text-right">홈런</span>
          <span className="py-3 text-right">볼넷</span>
          <span className="py-3 text-right">삼진</span>
          <span className="py-3 text-right">도루</span>
          <span className="py-3 text-right">타율</span>
          <InningGridHeader />
        </div>
        <div className="divide-y divide-line bg-card">
          {rows.map((row, rowIndex) => (
            <div
              key={`${row.name}-${row.avg}-${row.ab}`}
              className={`grid grid-cols-[140px_56px_56px_56px_56px_56px_56px_56px_56px_70px_432px] items-stretch px-4 py-0 text-sm ${
                rowIndex % 2 === 0 ? "bg-white" : "bg-[#fbfcfe]"
              }`}
            >
              <span className="flex items-center font-medium text-foreground">
                {row.name}
              </span>
              <span className="flex items-center justify-end">{row.ab}</span>
              <span className="flex items-center justify-end">{row.runs}</span>
              <span className="flex items-center justify-end">{row.hits}</span>
              <span className="flex items-center justify-end">{row.rbi}</span>
              <span className="flex items-center justify-end">{row.hr}</span>
              <span className="flex items-center justify-end">{row.bb}</span>
              <span className="flex items-center justify-end">{row.so}</span>
              <span className="flex items-center justify-end">{row.sb}</span>
              <span className="flex items-center justify-end font-semibold text-primary">
                {row.avg}
              </span>
              <InningResultGrid
                results={row.plateAppearancesByInning}
                striped={rowIndex % 2 === 1}
              />
            </div>
          ))}
          <div className="grid grid-cols-[140px_56px_56px_56px_56px_56px_56px_56px_56px_70px_432px] items-stretch bg-soft/70 px-4 py-0 text-sm">
            <span className="flex items-center font-semibold text-foreground">
              합계
            </span>
            <span className="flex items-center justify-end font-semibold">
              {totals.ab}
            </span>
            <span className="flex items-center justify-end font-semibold">
              {totals.runs}
            </span>
            <span className="flex items-center justify-end font-semibold">
              {totals.hits}
            </span>
            <span className="flex items-center justify-end font-semibold">
              {totals.rbi}
            </span>
            <span className="flex items-center justify-end font-semibold">
              {totals.hr}
            </span>
            <span className="flex items-center justify-end font-semibold">
              {totals.bb}
            </span>
            <span className="flex items-center justify-end font-semibold">
              {totals.so}
            </span>
            <span className="flex items-center justify-end font-semibold">
              {totals.sb}
            </span>
            <span className="flex items-center justify-end font-semibold text-primary">
              -
            </span>
            <InningResultGrid results={Array(9).fill("")} striped />
          </div>
        </div>
      </div>
    </div>
  );
}

function InningGridHeader() {
  return (
    <div className="grid grid-cols-9 border-l border-line bg-[#dbe4f0]">
      {["1회", "2회", "3회", "4회", "5회", "6회", "7회", "8회", "9회"].map(
        (inning) => (
          <span
            key={inning}
            className="flex h-11 items-center justify-center border-l border-line text-center text-[11px] font-semibold text-muted first:border-l-0"
          >
            {inning}
          </span>
        ),
      )}
    </div>
  );
}

function InningResultGrid({
  results,
  striped = false,
}: Readonly<{
  results: string[];
  striped?: boolean;
}>) {
  const normalizedResults = Array.from({ length: 9 }, (_, index) => results[index] ?? "");

  return (
    <div className="grid grid-cols-9 border-l border-line">
      {normalizedResults.map((result, index) => (
        <span
          key={`inning-result-${index}-${result}`}
          className={`flex h-11 items-center justify-center border-l border-line px-1 text-center text-[11px] leading-tight text-foreground first:border-l-0 ${
            striped
              ? index % 2 === 0
                ? "bg-[#fbfcfe]"
                : "bg-[#f5f7fb]"
              : index % 2 === 0
                ? "bg-white"
                : "bg-[#f8fafc]"
          }`}
        >
          {result}
        </span>
      ))}
    </div>
  );
}

function PitchingTable({
  rows,
}: Readonly<{
  rows: Array<{
    name: string;
    ip: string;
    hitsAllowed: number;
    runs: number;
    earnedRuns: number;
    walks: number;
    strikeouts: number;
    homeRunsAllowed: number;
    batters: number;
    atBats: number;
    pitches: number;
    gameType: string;
    win: string;
    loss: string;
    save: string;
  }>;
}>) {
  const totals = rows.reduce(
    (accumulator, row) => {
      accumulator.hitsAllowed += row.hitsAllowed;
      accumulator.runs += row.runs;
      accumulator.earnedRuns += row.earnedRuns;
      accumulator.walks += row.walks;
      accumulator.strikeouts += row.strikeouts;
      accumulator.homeRunsAllowed += row.homeRunsAllowed;
      accumulator.batters += row.batters;
      accumulator.atBats += row.atBats;
      accumulator.pitches += row.pitches;
      return accumulator;
    },
    {
      hitsAllowed: 0,
      runs: 0,
      earnedRuns: 0,
      walks: 0,
      strikeouts: 0,
      homeRunsAllowed: 0,
      batters: 0,
      atBats: 0,
      pitches: 0,
    },
  );

  return (
    <div className="overflow-x-auto rounded-3xl border border-line">
      <div className="min-w-[1140px]">
        <div className="grid grid-cols-[120px_70px_70px_56px_56px_70px_56px_70px_56px_56px_70px_90px_70px_70px_70px] bg-soft px-4 py-3 text-xs font-semibold text-muted">
          <span>투수명</span>
          <span className="text-right">이닝</span>
          <span className="text-right">피안타</span>
          <span className="text-right">실점</span>
          <span className="text-right">자책</span>
          <span className="text-right">4사구</span>
          <span className="text-right">삼진</span>
          <span className="text-right">피홈런</span>
          <span className="text-right">타자</span>
          <span className="text-right">타수</span>
          <span className="text-right">투구수</span>
          <span className="text-right">경기</span>
          <span className="text-right">승리</span>
          <span className="text-right">패전</span>
          <span className="text-right">세이브</span>
        </div>
        <div className="divide-y divide-line bg-card">
          {rows.map((row) => (
            <div
              key={row.name}
              className="grid grid-cols-[120px_70px_70px_56px_56px_70px_56px_70px_56px_56px_70px_90px_70px_70px_70px] items-center px-4 py-3 text-sm"
            >
              <span className="font-medium text-foreground">{row.name}</span>
              <span className="text-right font-semibold text-primary">
                {row.ip}
              </span>
              <span className="text-right">{row.hitsAllowed}</span>
              <span className="text-right">{row.runs}</span>
              <span className="text-right">{row.earnedRuns}</span>
              <span className="text-right">{row.walks}</span>
              <span className="text-right">{row.strikeouts}</span>
              <span className="text-right">{row.homeRunsAllowed}</span>
              <span className="text-right">{row.batters}</span>
              <span className="text-right">{row.atBats}</span>
              <span className="text-right">{row.pitches}</span>
              <span className="text-right text-muted">{row.gameType}</span>
              <span className="text-right text-accent">{row.win}</span>
              <span className="text-right text-accent">{row.loss}</span>
              <span className="text-right text-accent">{row.save}</span>
            </div>
          ))}
          <div className="grid grid-cols-[120px_70px_70px_56px_56px_70px_56px_70px_56px_56px_70px_90px_70px_70px_70px] items-center bg-soft/70 px-4 py-3 text-sm">
            <span className="font-semibold text-foreground">합계</span>
            <span className="text-right font-semibold text-primary">-</span>
            <span className="text-right font-semibold">{totals.hitsAllowed}</span>
            <span className="text-right font-semibold">{totals.runs}</span>
            <span className="text-right font-semibold">{totals.earnedRuns}</span>
            <span className="text-right font-semibold">{totals.walks}</span>
            <span className="text-right font-semibold">{totals.strikeouts}</span>
            <span className="text-right font-semibold">
              {totals.homeRunsAllowed}
            </span>
            <span className="text-right font-semibold">{totals.batters}</span>
            <span className="text-right font-semibold">{totals.atBats}</span>
            <span className="text-right font-semibold">{totals.pitches}</span>
            <span className="text-right text-muted">-</span>
            <span className="text-right text-muted">-</span>
            <span className="text-right text-muted">-</span>
            <span className="text-right text-muted">-</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function displayScore(value: number | null) {
  return value === null ? "-" : String(value);
}
