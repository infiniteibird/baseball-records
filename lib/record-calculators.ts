import { getGameDetailById } from "@/data/mock-games";
import { POSITION_OPTIONS } from "@/lib/position-options";
import type {
  BattingStatRow,
  GameDetail,
  GameStatus,
  PitchingStatRow,
  StoredGame,
  TeamConfig,
} from "@/data/types";
import { recordCodeMap } from "@/lib/record-codes";
import type {
  BatterRecordRow,
  PitcherRecordRow,
  RecordCellEntry,
  SavedGameRecord,
  TeamPitcherAssignment,
} from "@/types/record";
import { buildPitchingRowsFromAssignments } from "@/lib/pitching-calculator";

const defaultPositions = POSITION_OPTIONS.slice(0, 9).map((position) => position.value);

type BattingTotals = {
  ab: number;
  runs: number;
  hits: number;
  rbi: number;
  hr: number;
  bb: number;
  so: number;
  sb: number;
  hbp: number;
  doubles: number;
  triples: number;
  errorsReached: number;
  doublePlays: number;
  outs: number;
};

type TeamSummary = {
  battingRows: BattingStatRow[];
  pitchingRows: PitchingStatRow[];
  lineRuns: string[];
  totals: {
    R: string;
    H: string;
    E: string;
    B: string;
  };
  comparisons: {
    hits: number;
    homeRuns: number;
    steals: number;
    strikeouts: number;
    doublePlays: number;
    errorsCommittedByOpponent: number;
  };
  summaryLists: {
    homeRuns: string[];
    doubles: string[];
    steals: string[];
    caughtStealing: string[];
    baserunningOuts: string[];
    pickoffs: string[];
    passedBalls: string[];
  };
  runs: number;
};

export function createInitialRecordForGame(
  game: StoredGame,
  teams: TeamConfig[],
): SavedGameRecord {
  const mockDetail = getGameDetailById(game.id);
  const awayTeam = teams.find((team) => team.id === game.awayTeamId);
  const homeTeam = teams.find((team) => team.id === game.homeTeamId);

  const awayBatters =
    mockDetail?.battingStats
      .filter((row) => row.team === "away")
      .map((row, index) => toBatterRow(row.name, index + 1, defaultPositions[index] ?? "CF", row.plateAppearancesByInning))
      ?? buildDefaultBatters(awayTeam);

  const homeBatters =
    mockDetail?.battingStats
      .filter((row) => row.team === "home")
      .map((row, index) => toBatterRow(row.name, index + 1, defaultPositions[index] ?? "CF", row.plateAppearancesByInning))
      ?? buildDefaultBatters(homeTeam);

  const awayPitchers =
    mockDetail?.pitchingStats
      .filter((row) => row.team === "away")
      .map((row, index) => toPitcherRow(row.name, row.gameType || `투수 ${index + 1}`))
      ?? buildDefaultPitchers(awayTeam);

  const homePitchers =
    mockDetail?.pitchingStats
      .filter((row) => row.team === "home")
      .map((row, index) => toPitcherRow(row.name, row.gameType || `투수 ${index + 1}`))
      ?? buildDefaultPitchers(homeTeam);

  return {
    gameId: game.id,
    updatedAt: new Date().toISOString(),
    saveStatus: "draft",
    away: {
      batters: awayBatters,
      pitchers: awayPitchers,
      pitcherAssignments: {},
    },
    home: {
      batters: homeBatters,
      pitchers: homePitchers,
      pitcherAssignments: {},
    },
  };
}

export function buildGameDetailFromRecord(
  game: StoredGame,
  teams: TeamConfig[],
  record: SavedGameRecord,
): GameDetail {
  const awayTeamName = findTeamName(teams, game.awayTeamId);
  const homeTeamName = findTeamName(teams, game.homeTeamId);
  const awayPitchAssignments = getTeamPitcherAssignments(record.away.pitcherAssignments);
  const homePitchAssignments = getTeamPitcherAssignments(record.home.pitcherAssignments);

  const awayPitchingRows = summarizeTeamPitchingRows(
    record.home.batters,
    record.away.pitchers,
    awayPitchAssignments,
    "away",
  );
  const homePitchingRows = summarizeTeamPitchingRows(
    record.away.batters,
    record.home.pitchers,
    homePitchAssignments,
    "home",
  );

  const awaySummary = summarizeTeamRecord(
    record.away.batters,
    record.home.pitchers,
    "away",
    awayPitchingRows,
  );
  const homeSummary = summarizeTeamRecord(
    record.home.batters,
    record.away.pitchers,
    "home",
    homePitchingRows,
  );

  const awayErrors = homeSummary.comparisons.errorsCommittedByOpponent;
  const homeErrors = awaySummary.comparisons.errorsCommittedByOpponent;

  const decisiveTeam =
    awaySummary.runs > homeSummary.runs ? awaySummary : homeSummary.runs > awaySummary.runs ? homeSummary : null;
  const decisiveHit = decisiveTeam?.summaryLists.homeRuns[0]
    ?? decisiveTeam?.summaryLists.doubles[0]
    ?? "기록 입력 중";

  return {
    id: game.id,
    date: game.date,
    time: game.time,
    stadium: game.stadium,
    status: game.status,
    awayTeam: awayTeamName,
    homeTeam: homeTeamName,
    awayScore: awaySummary.runs,
    homeScore: homeSummary.runs,
    note:
      record.saveStatus === "saved"
        ? "관리자 기록 입력이 저장된 경기입니다."
        : "관리자 기록 입력이 임시저장된 경기입니다.",
    lineScore: {
      innings: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
      awayRuns: awaySummary.lineRuns,
      homeRuns: homeSummary.lineRuns,
      awayTotals: {
        R: String(awaySummary.runs),
        H: awaySummary.totals.H,
        E: String(awayErrors),
        B: awaySummary.totals.B,
      },
      homeTotals: {
        R: String(homeSummary.runs),
        H: homeSummary.totals.H,
        E: String(homeErrors),
        B: homeSummary.totals.B,
      },
    },
    teamStatsComparison: [
      { label: "안타", away: awaySummary.comparisons.hits, home: homeSummary.comparisons.hits },
      { label: "홈런", away: awaySummary.comparisons.homeRuns, home: homeSummary.comparisons.homeRuns },
      { label: "도루", away: awaySummary.comparisons.steals, home: homeSummary.comparisons.steals },
      { label: "삼진", away: awaySummary.comparisons.strikeouts, home: homeSummary.comparisons.strikeouts },
      { label: "병살", away: awaySummary.comparisons.doublePlays, home: homeSummary.comparisons.doublePlays },
      { label: "실책", away: awayErrors, home: homeErrors },
    ],
    summary: {
      decisiveHit,
      homeRuns: formatSummaryList(awaySummary.summaryLists.homeRuns, homeSummary.summaryLists.homeRuns),
      doubles: formatSummaryList(awaySummary.summaryLists.doubles, homeSummary.summaryLists.doubles),
      steals: formatSummaryList(awaySummary.summaryLists.steals, homeSummary.summaryLists.steals),
      caughtStealing: formatSummaryList(awaySummary.summaryLists.caughtStealing, homeSummary.summaryLists.caughtStealing),
      baserunningOuts: formatSummaryList(awaySummary.summaryLists.baserunningOuts, homeSummary.summaryLists.baserunningOuts),
      pickoffs: formatSummaryList(awaySummary.summaryLists.pickoffs, homeSummary.summaryLists.pickoffs),
      passedBalls: formatSummaryList(awaySummary.summaryLists.passedBalls, homeSummary.summaryLists.passedBalls),
      umpires: "관리자 기록 입력 페이지에서 미입력",
    },
    battingStats: [...awaySummary.battingRows, ...homeSummary.battingRows],
    pitchingStats: [...awaySummary.pitchingRows, ...homeSummary.pitchingRows],
  };
}

export function applyRecordToGame(
  game: StoredGame,
  teams: TeamConfig[],
  record: SavedGameRecord,
  saveStatus: "draft" | "saved",
): StoredGame {
  const detail = buildGameDetailFromRecord(game, teams, {
    ...record,
    saveStatus,
  });

  return {
    ...game,
    awayScore: detail.awayScore,
    homeScore: detail.homeScore,
    status: saveStatus === "saved" ? "종료" : normalizeDraftStatus(game.status, detail.awayScore, detail.homeScore),
    note:
      saveStatus === "saved"
        ? "관리자 기록 저장 완료"
        : "관리자 기록 임시저장",
    detailAvailable: true,
    createdAt: new Date().toISOString(),
  };
}

function normalizeDraftStatus(status: GameStatus, awayScore: number | null, homeScore: number | null) {
  if (status === "종료") {
    return "종료";
  }

  if (awayScore === null || homeScore === null) {
    return status;
  }

  return "진행중";
}

function summarizeTeamRecord(
  batters: BatterRecordRow[],
  pitchers: PitcherRecordRow[],
  team: "away" | "home",
  pitchingRows?: PitchingStatRow[],
): TeamSummary {
  const inningRuns = Array.from({ length: 9 }, () => 0);
  const battingRows = batters.map((row) => {
    const totals = summarizeBatterRow(row, inningRuns);
    const runs = row.manualRuns ?? totals.runs;
    const rbi = row.manualRbi ?? totals.rbi;

    return {
      team,
      name: row.playerName,
      ab: totals.ab,
      runs,
      hits: totals.hits,
      rbi,
      hr: totals.hr,
      bb: totals.bb,
      so: totals.so,
      sb: totals.sb,
      avg: totals.ab === 0 ? ".000" : `.${Math.round((totals.hits / totals.ab) * 1000)
        .toString()
        .padStart(3, "0")}`,
      plateAppearancesByInning: row.inningResults.map(formatCellEntries),
    } satisfies BattingStatRow;
  });

  const teamTotals = battingRows.reduce(
    (accumulator, row) => {
      accumulator.hits += row.hits;
      accumulator.homeRuns += row.hr;
      accumulator.steals += row.sb;
      accumulator.strikeouts += row.so;
      accumulator.walks += row.bb;
      accumulator.reachBase += row.hits + row.bb;
      accumulator.runs += row.runs;
      return accumulator;
    },
    {
      hits: 0,
      homeRuns: 0,
      steals: 0,
      strikeouts: 0,
      walks: 0,
      reachBase: 0,
      runs: 0,
    },
  );

  const lists = collectSummaryLists(batters);
  const defensiveErrors = countOpponentErrors(batters);
  const doublePlays = countCategory(batters, "double_play");
  const pitcherSummaries =
    pitchingRows ??
    summarizeTeamPitchingRows(batters, pitchers, {}, team);

  return {
    battingRows,
    pitchingRows: pitcherSummaries,
    lineRuns: inningRuns.map((value) => String(value)),
    totals: {
      R: String(teamTotals.runs),
      H: String(teamTotals.hits),
      E: "0",
      B: String(teamTotals.reachBase),
    },
    comparisons: {
      hits: teamTotals.hits,
      homeRuns: teamTotals.homeRuns,
      steals: teamTotals.steals,
      strikeouts: teamTotals.strikeouts,
      doublePlays,
      errorsCommittedByOpponent: defensiveErrors,
    },
    summaryLists: lists,
    runs: teamTotals.runs,
  };
}

function summarizeTeamPitchingRows(
  opposingBatters: BatterRecordRow[],
  pitchers: PitcherRecordRow[],
  assignments: TeamPitcherAssignment,
  team: "away" | "home",
) {
  return buildPitchingRowsFromAssignments(team, opposingBatters, pitchers, assignments);
}

function summarizeBatterRow(row: BatterRecordRow, inningRuns: number[]) {
  return row.inningResults.reduce<BattingTotals>(
    (accumulator, cellEntries, inningIndex) => {
      cellEntries.forEach((entry, entryIndex) => {
        const definition = recordCodeMap.get(entry.code);
        if (!definition) {
          return;
        }

        const isMainResult = entryIndex === 0;
        switch (definition.category) {
          case "single":
            accumulator.hits += 1;
            accumulator.ab += 1;
            break;
          case "double":
            accumulator.hits += 1;
            accumulator.ab += 1;
            accumulator.doubles += 1;
            break;
          case "triple":
            accumulator.hits += 1;
            accumulator.ab += 1;
            accumulator.triples += 1;
            break;
          case "home_run":
            accumulator.hits += 1;
            accumulator.ab += 1;
            accumulator.hr += 1;
            accumulator.rbi += 1;
            accumulator.runs += 1;
            inningRuns[inningIndex] += 1;
            break;
          case "walk":
          case "intentional_walk":
            accumulator.bb += 1;
            break;
          case "hit_by_pitch":
            accumulator.hbp += 1;
            break;
          case "strikeout":
            accumulator.so += 1;
            accumulator.ab += 1;
            accumulator.outs += 1;
            break;
          case "groundout":
          case "out":
            if (isMainResult) {
              accumulator.ab += 1;
            }
            accumulator.outs += 1;
            break;
          case "double_play":
            accumulator.ab += 1;
            accumulator.outs += 2;
            accumulator.doublePlays += 1;
            break;
          case "sac_bunt":
          case "sac_fly":
            accumulator.outs += 1;
            break;
          case "error":
            accumulator.ab += 1;
            accumulator.errorsReached += 1;
            break;
          case "fielders_choice":
            accumulator.ab += 1;
            break;
          case "steal":
            accumulator.sb += 1;
            break;
          case "run_scored":
            accumulator.runs += 1;
            inningRuns[inningIndex] += 1;
            break;
          case "rbi":
            accumulator.rbi += 1;
            break;
          default:
            break;
        }
      });

      return accumulator;
    },
    {
      ab: 0,
      runs: 0,
      hits: 0,
      rbi: 0,
      hr: 0,
      bb: 0,
      so: 0,
      sb: 0,
      hbp: 0,
      doubles: 0,
      triples: 0,
      errorsReached: 0,
      doublePlays: 0,
      outs: 0,
    },
  );
}

function collectSummaryLists(batters: BatterRecordRow[]) {
  const createEntries = (category: string) =>
    batters.flatMap((batter) =>
      batter.inningResults.flatMap((entries, inningIndex) =>
        entries
          .filter((entry) => recordCodeMap.get(entry.code)?.category === category)
          .map(() => `${batter.playerName}(${inningIndex + 1}회)`),
      ),
    );

  return {
    homeRuns: createEntries("home_run"),
    doubles: createEntries("double"),
    steals: createEntries("steal"),
    caughtStealing: createEntries("caught_stealing"),
    baserunningOuts: createEntries("baserunning_out"),
    pickoffs: createEntries("pickoff"),
    passedBalls: createEntries("passed_ball"),
  };
}

function countOpponentErrors(batters: BatterRecordRow[]) {
  return batters.reduce(
    (count, batter) =>
      count +
      batter.inningResults.reduce(
        (inningCount, entries) =>
          inningCount +
          entries.filter((entry) => recordCodeMap.get(entry.code)?.category === "error").length,
        0,
      ),
    0,
  );
}

function countCategory(batters: BatterRecordRow[], category: string) {
  return batters.reduce(
    (count, batter) =>
      count +
      batter.inningResults.reduce(
        (inningCount, entries) =>
          inningCount +
          entries.filter((entry) => recordCodeMap.get(entry.code)?.category === category).length,
        0,
      ),
    0,
  );
}

function toBatterRow(
  playerName: string,
  battingOrder: number,
  position: string,
  inningValues?: string[],
): BatterRecordRow {
  return {
    id: `batter-${playerName}-${battingOrder}-${Math.random().toString(36).slice(2, 7)}`,
    battingOrder,
    playerName,
    position,
    inningResults: Array.from({ length: 9 }, (_, index) => {
      const value = inningValues?.[index] ?? "";
      return value ? [{ id: `cell-${index}-${value}`, code: value }] : [];
    }),
  };
}

function toPitcherRow(name: string, role: string): PitcherRecordRow {
  return {
    id: `pitcher-${name}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    role,
  };
}

function buildDefaultBatters(team?: TeamConfig) {
  const players = team?.players ?? [];
  const count = Math.max(9, Math.min(10, players.length || 9));

  return Array.from({ length: count }, (_, index) =>
    toBatterRow(
      players[index] ?? `${team?.name ?? "팀"} 타자 ${index + 1}`,
      index + 1,
      defaultPositions[index] ?? "CF",
    ),
  );
}

function buildDefaultPitchers(team?: TeamConfig) {
  const firstPlayer = team?.players[0] ?? `${team?.name ?? "팀"} 투수`;
  return [toPitcherRow(firstPlayer, "선발")];
}

function findTeamName(teams: TeamConfig[], teamId: string) {
  return teams.find((team) => team.id === teamId)?.name ?? teamId;
}

function formatCellEntries(entries: RecordCellEntry[]) {
  return entries.map((entry) => entry.code).join(" + ");
}

function formatSummaryList(awayItems: string[], homeItems: string[]) {
  const items = [...awayItems, ...homeItems];
  return items.length > 0 ? items.join(", ") : "없음";
}

function getTeamPitcherAssignments(
  assignments: TeamPitcherAssignment | undefined,
): TeamPitcherAssignment {
  return assignments ?? {};
}
