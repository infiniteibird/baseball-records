"use client";

import { useDeferredValue, useState } from "react";
import {
  type HitterStatsRow,
  type PitcherStatsRow,
} from "@/data/types";

type PlayersPageClientProps = {
  hitters: HitterStatsRow[];
  pitchers: PitcherStatsRow[];
  teams: string[];
  teamFinishedGameCounts: Record<string, number>;
  teamPlateAppearanceMinimums: Record<string, number>;
};

type PlayerTab = "hitters" | "pitchers";
type SortDirection = "asc" | "desc";
type HitterQualificationFilter = "all" | "qualified_in" | "qualified_out";
type HitterSortKey =
  | "player"
  | "avg"
  | "team_games"
  | "games"
  | "pa"
  | "ab"
  | "hits"
  | "hr"
  | "doubles"
  | "triples"
  | "rbi"
  | "runs"
  | "steals"
  | "bb"
  | "hbp"
  | "so"
  | "obp"
  | "slg"
  | "ops";
type PitcherSortKey =
  | "player"
  | "team"
  | "era"
  | "whip"
  | "ip"
  | "so"
  | "wins"
  | "losses"
  | "saves";

const tabs: { key: PlayerTab; label: string; description: string }[] = [
  {
    key: "hitters",
    label: "타자 기록",
    description: "타율, 팀 경기, 선수 경기, 타석, 타수, 안타, 홈런, 2루타, 3루타, 타점, 득점, 도루, 볼넷, 사구, 삼진, 출루율, 장타율, OPS",
  },
  {
    key: "pitchers",
    label: "투수 기록",
    description: "ERA, WHIP, 이닝, 탈삼진, 승, 패, 세이브",
  },
];

const hitterColumns: { key: HitterSortKey; label: string }[] = [
  { key: "player", label: "선수명" },
  { key: "avg", label: "타율" },
  { key: "team_games", label: "팀 경기" },
  { key: "games", label: "선수 경기" },
  { key: "pa", label: "타석" },
  { key: "ab", label: "타수" },
  { key: "hits", label: "안타" },
  { key: "hr", label: "홈런" },
  { key: "doubles", label: "2루타" },
  { key: "triples", label: "3루타" },
  { key: "rbi", label: "타점" },
  { key: "runs", label: "득점" },
  { key: "steals", label: "도루" },
  { key: "bb", label: "볼넷" },
  { key: "hbp", label: "사구" },
  { key: "so", label: "삼진" },
  { key: "obp", label: "출루율" },
  { key: "slg", label: "장타율" },
  { key: "ops", label: "OPS" },
];

const pitcherColumns: { key: PitcherSortKey; label: string }[] = [
  { key: "player", label: "선수명" },
  { key: "team", label: "팀" },
  { key: "era", label: "ERA" },
  { key: "whip", label: "WHIP" },
  { key: "ip", label: "이닝" },
  { key: "so", label: "탈삼진" },
  { key: "wins", label: "승" },
  { key: "losses", label: "패" },
  { key: "saves", label: "세이브" },
];

export function PlayersPageClient({
  hitters,
  pitchers,
  teams,
  teamFinishedGameCounts,
  teamPlateAppearanceMinimums,
}: Readonly<PlayersPageClientProps>) {
  const [activeTab, setActiveTab] = useState<PlayerTab>("hitters");
  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("전체");
  const [hitterQualificationFilter, setHitterQualificationFilter] =
    useState<HitterQualificationFilter>("all");
  const [hitterSort, setHitterSort] = useState<{
    key: HitterSortKey;
    direction: SortDirection;
  }>({
    key: "avg",
    direction: "desc",
  });
  const [pitcherSort, setPitcherSort] = useState<{
    key: PitcherSortKey;
    direction: SortDirection;
  }>({
    key: "era",
    direction: "asc",
  });

  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = deferredSearch.trim().toLowerCase();

  const filteredHitters = hitters.filter((player) => {
    const matchesTeam =
      selectedTeam === "전체" ? true : player.team === selectedTeam;
    const matchesSearch =
      normalizedSearch.length === 0
        ? true
        : player.player.toLowerCase().includes(normalizedSearch);
    const teamMinimum = teamPlateAppearanceMinimums[player.team] ?? 0;
    const matchesQualification =
      hitterQualificationFilter === "all"
        ? true
        : hitterQualificationFilter === "qualified_in"
          ? player.pa >= teamMinimum
          : player.pa < teamMinimum;

    return matchesTeam && matchesSearch && matchesQualification;
  });

  const filteredPitchers = pitchers.filter((player) => {
    const matchesTeam =
      selectedTeam === "전체" ? true : player.team === selectedTeam;
    const matchesSearch =
      normalizedSearch.length === 0
        ? true
        : player.player.toLowerCase().includes(normalizedSearch);

    return matchesTeam && matchesSearch;
  });

  const sortedHitters = [...filteredHitters].sort((playerA, playerB) =>
    compareValues(
      hitterValue(playerA, hitterSort.key, teamFinishedGameCounts),
      hitterValue(playerB, hitterSort.key, teamFinishedGameCounts),
      hitterSort.direction,
    ),
  );

  const sortedPitchers = [...filteredPitchers].sort((playerA, playerB) =>
    compareValues(
      pitcherValue(playerA, pitcherSort.key),
      pitcherValue(playerB, pitcherSort.key),
      pitcherSort.direction,
    ),
  );

  const currentCount =
    activeTab === "hitters" ? sortedHitters.length : sortedPitchers.length;
  const currentSortLabel =
    activeTab === "hitters"
      ? `${columnLabel(hitterColumns, hitterSort.key)} ${directionLabel(hitterSort.direction)}`
      : `${columnLabel(pitcherColumns, pitcherSort.key)} ${directionLabel(pitcherSort.direction)}`;

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-line bg-card p-4 shadow-[0_16px_40px_rgba(16,35,63,0.08)] sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={
                    isActive
                      ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(19,60,115,0.22)]"
                      : "rounded-full border border-line bg-soft px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-muted">
                선수 검색
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="선수 이름 검색"
                className="h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-muted">
                팀 필터
              </span>
              <select
                value={selectedTeam}
                onChange={(event) => setSelectedTeam(event.target.value)}
                className="h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground outline-none transition-colors focus:border-primary"
              >
                <option value="전체">전체</option>
                {teams.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-2xl bg-soft px-4 py-3">
              <p className="text-xs font-semibold text-muted">정렬 상태</p>
              <strong className="mt-1 block text-sm text-foreground">
                {currentSortLabel}
              </strong>
              <p className="mt-1 text-xs text-muted">{currentCount}명 표시 중</p>
            </div>
          </div>

          {activeTab === "hitters" ? (
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="inline-flex w-full flex-wrap gap-2 rounded-[24px] bg-soft p-2 sm:w-auto sm:flex-nowrap">
                {[
                  { key: "all", label: "전체" },
                  { key: "qualified_in", label: "규정 IN" },
                  { key: "qualified_out", label: "규정 OUT" },
                ].map((option) => {
                  const isActive = hitterQualificationFilter === option.key;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() =>
                        setHitterQualificationFilter(
                          option.key as HitterQualificationFilter,
                        )
                      }
                      className={
                        isActive
                          ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(19,60,115,0.18)]"
                          : "rounded-full px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-primary"
                      }
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="px-1 text-xs font-medium text-muted sm:px-0">
                규정 타석 = 소속 팀 경기 수 x 2
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 md:hidden">
            {(activeTab === "hitters" ? hitterColumns : pitcherColumns).map(
              (column) => {
                const isActive =
                  activeTab === "hitters"
                    ? hitterSort.key === column.key
                    : pitcherSort.key === column.key;

                return (
                  <button
                    key={column.key}
                    type="button"
                    onClick={() =>
                      activeTab === "hitters"
                        ? toggleHitterSort(column.key as HitterSortKey)
                        : togglePitcherSort(column.key as PitcherSortKey)
                    }
                    className={
                      isActive
                        ? "rounded-full bg-primary px-3 py-2 text-xs font-semibold text-white"
                        : "rounded-full border border-line bg-card px-3 py-2 text-xs font-medium text-foreground"
                    }
                  >
                    {column.label}
                    {isActive ? (
                      <span className="ml-1">
                        {activeTab === "hitters"
                          ? sortArrow(hitterSort.direction)
                          : sortArrow(pitcherSort.direction)}
                      </span>
                    ) : null}
                  </button>
                );
              },
            )}
          </div>
        </div>
      </section>

      {activeTab === "hitters" ? (
        <>
          <div className="hidden overflow-x-auto rounded-[28px] border border-line bg-card shadow-[0_16px_40px_rgba(16,35,63,0.08)] md:block">
            <div className="min-w-[1604px]">
              <div className="grid grid-cols-[180px_repeat(18,72px)] bg-soft px-5 py-3 text-xs font-semibold text-muted">
                {hitterColumns.map((column) => (
                  <button
                    key={column.key}
                    type="button"
                    onClick={() => toggleHitterSort(column.key)}
                    className={`text-left ${numericHitterColumn(column.key) ? "text-right" : ""}`}
                  >
                    {column.label}
                    <span className="ml-1">
                      {hitterSort.key === column.key
                        ? sortArrow(hitterSort.direction)
                        : "·"}
                    </span>
                  </button>
                ))}
              </div>
              <div className="divide-y divide-line">
                {sortedHitters.map((player) => (
                  <div
                    key={`${player.team}-${player.player}`}
                    className="grid grid-cols-[180px_repeat(18,72px)] items-center px-5 py-4 text-sm"
                  >
                    <span className={hitterValueClass("player", hitterSort.key)}>
                      <span className="block font-medium text-foreground">
                        {player.player}
                      </span>
                      <span className="mt-1 block text-xs text-muted">
                        {player.team}
                      </span>
                    </span>
                    <span className={hitterValueClass("avg", hitterSort.key)}>
                      {player.avg}
                    </span>
                    <span className={hitterValueClass("team_games", hitterSort.key)}>
                      {teamFinishedGameCounts[player.team] ?? 0}
                    </span>
                    <span className={hitterValueClass("games", hitterSort.key)}>
                      {player.games}
                    </span>
                    <span className={hitterValueClass("pa", hitterSort.key)}>
                      {player.pa}
                    </span>
                    <span className={hitterValueClass("ab", hitterSort.key)}>
                      {player.ab}
                    </span>
                    <span className={hitterValueClass("hits", hitterSort.key)}>
                      {player.hits}
                    </span>
                    <span className={hitterValueClass("hr", hitterSort.key)}>
                      {player.hr}
                    </span>
                    <span className={hitterValueClass("doubles", hitterSort.key)}>
                      {player.doubles}
                    </span>
                    <span className={hitterValueClass("triples", hitterSort.key)}>
                      {player.triples}
                    </span>
                    <span className={hitterValueClass("rbi", hitterSort.key)}>
                      {player.rbi}
                    </span>
                    <span className={hitterValueClass("runs", hitterSort.key)}>
                      {player.runs}
                    </span>
                    <span className={hitterValueClass("steals", hitterSort.key)}>
                      {player.steals}
                    </span>
                    <span className={hitterValueClass("bb", hitterSort.key)}>
                      {player.bb}
                    </span>
                    <span className={hitterValueClass("hbp", hitterSort.key)}>
                      {player.hbp}
                    </span>
                    <span className={hitterValueClass("so", hitterSort.key)}>
                      {player.so}
                    </span>
                    <span className={hitterValueClass("obp", hitterSort.key)}>
                      {player.obp}
                    </span>
                    <span className={hitterValueClass("slg", hitterSort.key)}>
                      {player.slg}
                    </span>
                    <span className={hitterValueClass("ops", hitterSort.key)}>
                      {player.ops}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:hidden">
            {sortedHitters.map((player) => (
              <article
                key={`${player.team}-${player.player}`}
                className="rounded-[28px] border border-line bg-card p-4 shadow-[0_12px_30px_rgba(16,35,63,0.08)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      {player.player}
                    </h3>
                    <p className="mt-1 text-sm text-muted">{player.team}</p>
                  </div>
                  <span className="rounded-full bg-soft px-3 py-1 text-xs font-semibold text-primary">
                    OPS {player.ops}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 rounded-3xl bg-soft p-3">
                  <StatChip label="타율" value={player.avg} />
                  <StatChip
                    label="팀 경기"
                    value={String(teamFinishedGameCounts[player.team] ?? 0)}
                  />
                  <StatChip label="선수 경기" value={String(player.games)} />
                  <StatChip label="타석" value={String(player.pa)} />
                  <StatChip label="타수" value={String(player.ab)} />
                  <StatChip label="안타" value={String(player.hits)} />
                  <StatChip label="홈런" value={String(player.hr)} />
                  <StatChip label="2루타" value={String(player.doubles)} />
                  <StatChip label="3루타" value={String(player.triples)} />
                  <StatChip label="타점" value={String(player.rbi)} />
                  <StatChip label="득점" value={String(player.runs)} />
                  <StatChip label="도루" value={String(player.steals)} />
                  <StatChip label="볼넷" value={String(player.bb)} />
                  <StatChip label="사구" value={String(player.hbp)} />
                  <StatChip label="삼진" value={String(player.so)} />
                  <StatChip label="출루율" value={player.obp} />
                  <StatChip label="장타율" value={player.slg} />
                  <StatChip label="OPS" value={player.ops} accent />
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-[28px] border border-line bg-card shadow-[0_16px_40px_rgba(16,35,63,0.08)] md:block">
            <div className="min-w-[920px]">
              <div className="grid grid-cols-[140px_100px_90px_90px_90px_70px_70px_60px_60px] bg-soft px-5 py-3 text-xs font-semibold text-muted">
                {pitcherColumns.map((column) => (
                  <button
                    key={column.key}
                    type="button"
                    onClick={() => togglePitcherSort(column.key)}
                    className={`text-left ${numericPitcherColumn(column.key) ? "text-right" : ""}`}
                  >
                    {column.label}
                    <span className="ml-1">
                      {pitcherSort.key === column.key
                        ? sortArrow(pitcherSort.direction)
                        : "·"}
                    </span>
                  </button>
                ))}
              </div>
              <div className="divide-y divide-line">
                {sortedPitchers.map((player) => (
                  <div
                    key={`${player.team}-${player.player}`}
                    className="grid grid-cols-[140px_100px_90px_90px_90px_70px_70px_60px_60px] items-center px-5 py-4 text-sm"
                  >
                    <span
                      className={pitcherValueClass("player", pitcherSort.key)}
                    >
                      {player.player}
                    </span>
                    <span className={pitcherValueClass("team", pitcherSort.key)}>
                      {player.team}
                    </span>
                    <span className={pitcherValueClass("era", pitcherSort.key)}>
                      {player.era}
                    </span>
                    <span className={pitcherValueClass("whip", pitcherSort.key)}>
                      {player.whip}
                    </span>
                    <span className={pitcherValueClass("ip", pitcherSort.key)}>
                      {player.ip}
                    </span>
                    <span className={pitcherValueClass("so", pitcherSort.key)}>
                      {player.so}
                    </span>
                    <span className={pitcherValueClass("wins", pitcherSort.key)}>
                      {player.wins}
                    </span>
                    <span
                      className={pitcherValueClass("losses", pitcherSort.key)}
                    >
                      {player.losses}
                    </span>
                    <span className={pitcherValueClass("saves", pitcherSort.key)}>
                      {player.saves}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:hidden">
            {sortedPitchers.map((player) => (
              <article
                key={`${player.team}-${player.player}`}
                className="rounded-[28px] border border-line bg-card p-4 shadow-[0_12px_30px_rgba(16,35,63,0.08)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      {player.player}
                    </h3>
                    <p className="mt-1 text-sm text-muted">{player.team}</p>
                  </div>
                  <span className="rounded-full bg-soft px-3 py-1 text-xs font-semibold text-primary">
                    ERA {player.era}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 rounded-3xl bg-soft p-3">
                  <StatChip label="WHIP" value={player.whip} />
                  <StatChip label="이닝" value={player.ip} />
                  <StatChip label="탈삼진" value={String(player.so)} />
                  <StatChip label="승" value={String(player.wins)} />
                  <StatChip label="패" value={String(player.losses)} />
                  <StatChip label="세이브" value={String(player.saves)} accent />
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {currentCount === 0 ? (
        <div className="rounded-[28px] border border-dashed border-line bg-card px-5 py-10 text-center text-sm text-muted">
          조건에 맞는 선수가 없습니다. 검색어 또는 팀 필터를 바꿔보세요.
        </div>
      ) : null}
    </div>
  );

  function toggleHitterSort(key: HitterSortKey) {
    setHitterSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  }

  function togglePitcherSort(key: PitcherSortKey) {
    setPitcherSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  }
}

function hitterValue(
  player: HitterStatsRow,
  key: HitterSortKey,
  teamFinishedGameCounts: Record<string, number>,
) {
  switch (key) {
    case "player":
      return player.player;
    case "avg":
      return parseFloat(player.avg);
    case "team_games":
      return teamFinishedGameCounts[player.team] ?? 0;
    case "games":
      return player.games;
    case "pa":
      return player.pa;
    case "ab":
      return player.ab;
    case "hits":
      return player.hits;
    case "hr":
      return player.hr;
    case "doubles":
      return player.doubles;
    case "triples":
      return player.triples;
    case "rbi":
      return player.rbi;
    case "runs":
      return player.runs;
    case "steals":
      return player.steals;
    case "bb":
      return player.bb;
    case "hbp":
      return player.hbp;
    case "so":
      return player.so;
    case "obp":
      return parseFloat(player.obp);
    case "slg":
      return parseFloat(player.slg);
    case "ops":
      return parseFloat(player.ops);
  }
}

function pitcherValue(player: PitcherStatsRow, key: PitcherSortKey) {
  switch (key) {
    case "player":
      return player.player;
    case "team":
      return player.team;
    case "era":
      return parseFloat(player.era);
    case "whip":
      return parseFloat(player.whip);
    case "ip":
      return parseFloat(player.ip);
    case "so":
      return player.so;
    case "wins":
      return player.wins;
    case "losses":
      return player.losses;
    case "saves":
      return player.saves;
  }
}

function compareValues(
  valueA: string | number,
  valueB: string | number,
  direction: SortDirection,
) {
  if (typeof valueA === "string" && typeof valueB === "string") {
    const compared = valueA.localeCompare(valueB, "ko");

    return direction === "asc" ? compared : compared * -1;
  }

  const compared = Number(valueA) - Number(valueB);

  return direction === "asc" ? compared : compared * -1;
}

function sortArrow(direction: SortDirection) {
  return direction === "asc" ? "↑" : "↓";
}

function directionLabel(direction: SortDirection) {
  return direction === "asc" ? "오름차순" : "내림차순";
}

function columnLabel<T extends string>(
  columns: { key: T; label: string }[],
  key: T,
) {
  return columns.find((column) => column.key === key)?.label ?? key;
}

function numericHitterColumn(key: HitterSortKey) {
  return key !== "player";
}

function numericPitcherColumn(key: PitcherSortKey) {
  return key !== "player" && key !== "team";
}

function hitterValueClass(column: HitterSortKey, activeSort: HitterSortKey) {
  if (column === activeSort) {
    return numericHitterColumn(column)
      ? "text-right font-semibold text-primary"
      : "font-semibold text-primary";
  }

  if (column === "player") {
    return activeSort === "player"
      ? "font-semibold text-primary"
      : "text-left";
  }

  return "text-right text-foreground";
}

function pitcherValueClass(
  column: PitcherSortKey,
  activeSort: PitcherSortKey,
) {
  if (column === activeSort) {
    return numericPitcherColumn(column)
      ? "text-right font-semibold text-primary"
      : "font-semibold text-primary";
  }

  if (column === "player") {
    return "font-medium text-foreground";
  }

  if (column === "team") {
    return "text-muted";
  }

  return "text-right text-foreground";
}

function StatChip({
  label,
  value,
  accent = false,
}: Readonly<{
  label: string;
  value: string;
  accent?: boolean;
}>) {
  return (
    <div className="rounded-2xl bg-card px-3 py-3 text-center">
      <p className="text-[11px] font-semibold text-muted">{label}</p>
      <p
        className={
          accent
            ? "mt-1 text-sm font-bold text-accent"
            : "mt-1 text-sm font-bold text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}
