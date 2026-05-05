import type { GameStage, PitchingStatRow, StoredGame } from "@/data/types";
import type { BatterRecordRow, SavedGameRecord } from "@/types/record";
import { buildPitchingRowsFromAssignments } from "@/lib/pitching-calculator";
import { splitPlateAppearances } from "@/lib/record-plate-appearances";
import { recordCodeMap } from "@/lib/record-codes";

export type BatterMVPRankingRow = {
  rank: number;
  player: string;
  teamId: string;
  team: string;
  score: number;
  pa: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  runs: number;
  rbi: number;
  walks: number;
  hbp: number;
  intentionalWalks: number;
  sacrificeHits: number;
  outs: number;
  strikeouts: number;
  baserunningOuts: number;
  doublePlays: number;
  steals: number;
  caughtStealing: number;
};

export type PitcherMVPRankingRow = {
  rank: number;
  player: string;
  teamId: string;
  team: string;
  score: number;
  ip: string;
  outs: number;
  wins: number;
  losses: number;
  saves: number;
  strikeouts: number;
  hitsAllowed: number;
  homeRunsAllowed: number;
  walks: number;
  hbp: number;
  balks: number;
  runs: number;
  earnedRuns: number;
  nonEarnedRuns: number;
  completeGames: number;
  shutouts: number;
  noHitters: number;
  perfectGames: number;
};

type RawBatterMVPTotals = Omit<BatterMVPRankingRow, "rank" | "team">;
type RawPitcherMVPTotals = Omit<PitcherMVPRankingRow, "rank" | "team" | "ip" | "nonEarnedRuns">;

const BATTER_MVP_WEIGHTS = {
  pa: 1,
  single: 10,
  double: 20,
  triple: 30,
  homeRun: 50,
  run: 5,
  rbi: 10,
  walk: 5,
  hitByPitch: 5,
  intentionalWalk: 10,
  sacrificeHit: 5,
  out: -5,
  strikeout: -10,
  baserunningOut: -5,
  doublePlay: -10,
  steal: 10,
  caughtStealing: -5,
} as const;

const PITCHER_MVP_WEIGHTS = {
  out: 4,
  win: 100,
  loss: -25,
  save: 50,
  strikeout: 10,
  hitAllowed: -7,
  homeRunAllowed: -10,
  walk: -5,
  hitByPitch: -7,
  balk: -5,
  earnedRun: -10,
  nonEarnedRun: -5,
  shutout: 50,
  completeGame: 25,
  noHitter: 100,
  perfectGame: 200,
} as const;

export function buildBatterMVPRankings(
  games: StoredGame[],
  records: Record<string, SavedGameRecord>,
  teamNameMap: Map<string, string>,
) {
  const gameById = new Map(games.map((game) => [game.id, game]));
  const playerMap = new Map<string, RawBatterMVPTotals>();

  Object.entries(records).forEach(([gameId, record]) => {
    const game = gameById.get(gameId);
    if (!game) {
      return;
    }

    const multiplier = getGameStageMultiplier(game.stage);
    accumulateTeamRows(game.awayTeamId, record.away.batters, playerMap, multiplier);
    accumulateTeamRows(game.homeTeamId, record.home.batters, playerMap, multiplier);
  });

  return Array.from(playerMap.values())
    .map((row) => ({
      ...row,
      team: teamNameMap.get(row.teamId) ?? row.teamId,
      score: roundWeightedScore(row.score),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      if (a.team !== b.team) {
        return a.team.localeCompare(b.team, "ko");
      }

      return a.player.localeCompare(b.player, "ko");
    })
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    })) satisfies BatterMVPRankingRow[];
}

export function buildPitcherMVPRankings(
  games: StoredGame[],
  records: Record<string, SavedGameRecord>,
  teamNameMap: Map<string, string>,
) {
  const gameById = new Map(games.map((game) => [game.id, game]));
  const pitcherMap = new Map<string, RawPitcherMVPTotals>();

  Object.entries(records).forEach(([gameId, record]) => {
    const game = gameById.get(gameId);
    if (!game) {
      return;
    }

    const multiplier = getGameStageMultiplier(game.stage);
    accumulatePitcherGameRows(
      game.awayTeamId,
      buildPitchingRowsFromAssignments(
        "away",
        record.home.batters,
        record.away.pitchers,
        record.away.pitcherAssignments,
      ),
      pitcherMap,
      multiplier,
    );
    accumulatePitcherGameRows(
      game.homeTeamId,
      buildPitchingRowsFromAssignments(
        "home",
        record.away.batters,
        record.home.pitchers,
        record.home.pitcherAssignments,
      ),
      pitcherMap,
      multiplier,
    );
  });

  return Array.from(pitcherMap.values())
    .map((row) => {
      const nonEarnedRuns = Math.max(0, row.runs - row.earnedRuns);
      return {
        ...row,
        team: teamNameMap.get(row.teamId) ?? row.teamId,
        ip: formatInningsFromOuts(row.outs),
        nonEarnedRuns,
        score: roundWeightedScore(row.score),
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      if (a.team !== b.team) {
        return a.team.localeCompare(b.team, "ko");
      }

      return a.player.localeCompare(b.player, "ko");
    })
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    })) satisfies PitcherMVPRankingRow[];
}

function accumulateTeamRows(
  teamId: string,
  rows: BatterRecordRow[],
  playerMap: Map<string, RawBatterMVPTotals>,
  multiplier: number,
) {
  rows.forEach((row) => {
    const playerName = row.playerName.trim();
    if (!playerName) {
      return;
    }

    const key = `${teamId}::${playerName.toLowerCase()}`;
    const current = playerMap.get(key) ?? createEmptyMVPTotals(teamId, playerName);
    const totals = summarizeBatterRowForMVP(row);

    current.pa += totals.pa;
    current.singles += totals.singles;
    current.doubles += totals.doubles;
    current.triples += totals.triples;
    current.homeRuns += totals.homeRuns;
    current.runs += row.manualRuns ?? totals.runs;
    current.rbi += row.manualRbi ?? totals.rbi;
    current.walks += totals.walks;
    current.hbp += totals.hbp;
    current.intentionalWalks += totals.intentionalWalks;
    current.sacrificeHits += totals.sacrificeHits;
    current.outs += totals.outs;
    current.strikeouts += totals.strikeouts;
    current.baserunningOuts += totals.baserunningOuts;
    current.doublePlays += totals.doublePlays;
    current.steals += totals.steals;
    current.caughtStealing += totals.caughtStealing;
    current.score += calculateBatterMVPScore({
      ...current,
      score: 0,
      pa: totals.pa,
      singles: totals.singles,
      doubles: totals.doubles,
      triples: totals.triples,
      homeRuns: totals.homeRuns,
      runs: row.manualRuns ?? totals.runs,
      rbi: row.manualRbi ?? totals.rbi,
      walks: totals.walks,
      hbp: totals.hbp,
      intentionalWalks: totals.intentionalWalks,
      sacrificeHits: totals.sacrificeHits,
      outs: totals.outs,
      strikeouts: totals.strikeouts,
      baserunningOuts: totals.baserunningOuts,
      doublePlays: totals.doublePlays,
      steals: totals.steals,
      caughtStealing: totals.caughtStealing,
    }) * multiplier;

    playerMap.set(key, current);
  });
}

function summarizeBatterRowForMVP(row: BatterRecordRow) {
  return row.inningResults.reduce<{
    pa: number;
    singles: number;
    doubles: number;
    triples: number;
    homeRuns: number;
    runs: number;
    rbi: number;
    walks: number;
    hbp: number;
    intentionalWalks: number;
    sacrificeHits: number;
    outs: number;
    strikeouts: number;
    baserunningOuts: number;
    doublePlays: number;
    steals: number;
    caughtStealing: number;
  }>(
    (accumulator, cellEntries) => {
      const appearances = splitPlateAppearances(cellEntries);
      accumulator.pa += appearances.length;

      appearances.forEach((plateAppearance) => {
        plateAppearance.forEach((entry, entryIndex) => {
          const definition = recordCodeMap.get(entry.code);
          if (!definition) {
            return;
          }

          const isMainResult = entryIndex === 0;

          if (isMainResult) {
            switch (definition.category) {
              case "single":
                accumulator.singles += 1;
                break;
              case "double":
                accumulator.doubles += 1;
                break;
              case "triple":
                accumulator.triples += 1;
                break;
              case "home_run":
                accumulator.homeRuns += 1;
                accumulator.runs += 1;
                accumulator.rbi += 1;
                break;
              case "walk":
                accumulator.walks += 1;
                break;
              case "hit_by_pitch":
                accumulator.hbp += 1;
                break;
              case "intentional_walk":
                accumulator.intentionalWalks += 1;
                break;
              case "strikeout":
              case "strikeout_reached":
                accumulator.strikeouts += 1;
                break;
              case "out":
              case "groundout":
                accumulator.outs += 1;
                break;
              case "double_play":
                accumulator.doublePlays += 1;
                break;
              case "sac_bunt":
              case "sac_fly":
                accumulator.sacrificeHits += 1;
                break;
              default:
                break;
            }
          }

          switch (definition.category) {
            case "run_scored":
              accumulator.runs += 1;
              break;
            case "rbi":
              accumulator.rbi += 1;
              break;
            case "steal":
              accumulator.steals += 1;
              break;
            case "caught_stealing":
              accumulator.caughtStealing += 1;
              break;
            case "baserunning_out":
              accumulator.baserunningOuts += 1;
              break;
            default:
              break;
          }
        });
      });

      return accumulator;
    },
    {
      pa: 0,
      singles: 0,
      doubles: 0,
      triples: 0,
      homeRuns: 0,
      runs: 0,
      rbi: 0,
      walks: 0,
      hbp: 0,
      intentionalWalks: 0,
      sacrificeHits: 0,
      outs: 0,
      strikeouts: 0,
      baserunningOuts: 0,
      doublePlays: 0,
      steals: 0,
      caughtStealing: 0,
    },
  );
}

function accumulatePitcherGameRows(
  teamId: string,
  rows: PitchingStatRow[],
  pitcherMap: Map<string, RawPitcherMVPTotals>,
  multiplier: number,
) {
  const participatingRows = rows.filter((row) => row.name.trim().length > 0);
  const activeRows = rows.filter((row) => inningsStringToOuts(row.ip) > 0);
  const teamOuts = activeRows.reduce(
    (sum, row) => sum + inningsStringToOuts(row.ip),
    0,
  );

  activeRows.forEach((row) => {
    const playerName = row.name.trim();
    if (!playerName) {
      return;
    }

    const outs = inningsStringToOuts(row.ip);
    const isSinglePitcherGame = participatingRows.length === 1;
    const isCompleteGame = isSinglePitcherGame && outs === teamOuts && outs > 0;
    const isShutout = isCompleteGame && row.runs === 0;
    const isNoHitter = isCompleteGame && row.hitsAllowed === 0;
    const isPerfectGame =
      isCompleteGame &&
      row.hitsAllowed === 0 &&
      row.walks === 0 &&
      (row.hitByPitch ?? 0) === 0 &&
      row.batters === outs;
    const achievements = buildPitcherAchievementCounts({
      isCompleteGame,
      isShutout,
      isNoHitter,
      isPerfectGame,
    });

    const key = `${teamId}::${playerName.toLowerCase()}`;
    const current = pitcherMap.get(key) ?? createEmptyPitcherMVPTotals(teamId, playerName);

    current.outs += outs;
    current.wins += row.win === "승" ? 1 : 0;
    current.losses += row.loss === "패" ? 1 : 0;
    current.saves += row.save === "세" ? 1 : 0;
    current.strikeouts += row.strikeouts;
    current.hitsAllowed += row.hitsAllowed;
    current.homeRunsAllowed += row.homeRunsAllowed;
    current.walks += row.walks;
    current.hbp += row.hitByPitch ?? 0;
    current.balks += row.balks ?? 0;
    current.runs += row.runs;
    current.earnedRuns += row.earnedRuns;
    current.completeGames += achievements.completeGames;
    current.shutouts += achievements.shutouts;
    current.noHitters += achievements.noHitters;
    current.perfectGames += achievements.perfectGames;
    current.score += calculatePitcherMVPScore(
      {
        player: row.name,
        teamId,
        score: 0,
        outs,
        wins: row.win === "승" ? 1 : 0,
        losses: row.loss === "패" ? 1 : 0,
        saves: row.save === "세" ? 1 : 0,
        strikeouts: row.strikeouts,
        hitsAllowed: row.hitsAllowed,
        homeRunsAllowed: row.homeRunsAllowed,
        walks: row.walks,
        hbp: row.hitByPitch ?? 0,
        balks: row.balks ?? 0,
        runs: row.runs,
        earnedRuns: row.earnedRuns,
        completeGames: achievements.completeGames,
        shutouts: achievements.shutouts,
        noHitters: achievements.noHitters,
        perfectGames: achievements.perfectGames,
      },
      Math.max(0, row.runs - row.earnedRuns),
    ) * multiplier;

    pitcherMap.set(key, current);
  });
}

function getGameStageMultiplier(stage: GameStage | undefined) {
  switch (stage) {
    case "준결승":
      return 2;
    case "결승":
      return 8 / 3;
    case "예선":
    default:
      return 1;
  }
}

function roundWeightedScore(score: number) {
  return Number(score.toFixed(2));
}

function buildPitcherAchievementCounts({
  isCompleteGame,
  isShutout,
  isNoHitter,
  isPerfectGame,
}: {
  isCompleteGame: boolean;
  isShutout: boolean;
  isNoHitter: boolean;
  isPerfectGame: boolean;
}) {
  if (isPerfectGame) {
    return {
      completeGames: 0,
      shutouts: 0,
      noHitters: 0,
      perfectGames: 1,
    };
  }

  if (isNoHitter) {
    return {
      completeGames: 0,
      shutouts: 0,
      noHitters: 1,
      perfectGames: 0,
    };
  }

  if (isShutout) {
    return {
      completeGames: 0,
      shutouts: 1,
      noHitters: 0,
      perfectGames: 0,
    };
  }

  if (isCompleteGame) {
    return {
      completeGames: 1,
      shutouts: 0,
      noHitters: 0,
      perfectGames: 0,
    };
  }

  return {
    completeGames: 0,
    shutouts: 0,
    noHitters: 0,
    perfectGames: 0,
  };
}

function createEmptyMVPTotals(teamId: string, player: string): RawBatterMVPTotals {
  return {
    player,
    teamId,
    score: 0,
    pa: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    runs: 0,
    rbi: 0,
    walks: 0,
    hbp: 0,
    intentionalWalks: 0,
    sacrificeHits: 0,
    outs: 0,
    strikeouts: 0,
    baserunningOuts: 0,
    doublePlays: 0,
    steals: 0,
    caughtStealing: 0,
  };
}

function createEmptyPitcherMVPTotals(
  teamId: string,
  player: string,
): RawPitcherMVPTotals {
  return {
    player,
    teamId,
    score: 0,
    outs: 0,
    wins: 0,
    losses: 0,
    saves: 0,
    strikeouts: 0,
    hitsAllowed: 0,
    homeRunsAllowed: 0,
    walks: 0,
    hbp: 0,
    balks: 0,
    runs: 0,
    earnedRuns: 0,
    completeGames: 0,
    shutouts: 0,
    noHitters: 0,
    perfectGames: 0,
  };
}

function calculateBatterMVPScore(row: RawBatterMVPTotals) {
  return (
    row.pa * BATTER_MVP_WEIGHTS.pa +
    row.singles * BATTER_MVP_WEIGHTS.single +
    row.doubles * BATTER_MVP_WEIGHTS.double +
    row.triples * BATTER_MVP_WEIGHTS.triple +
    row.homeRuns * BATTER_MVP_WEIGHTS.homeRun +
    row.runs * BATTER_MVP_WEIGHTS.run +
    row.rbi * BATTER_MVP_WEIGHTS.rbi +
    row.walks * BATTER_MVP_WEIGHTS.walk +
    row.hbp * BATTER_MVP_WEIGHTS.hitByPitch +
    row.intentionalWalks * BATTER_MVP_WEIGHTS.intentionalWalk +
    row.sacrificeHits * BATTER_MVP_WEIGHTS.sacrificeHit +
    row.outs * BATTER_MVP_WEIGHTS.out +
    row.strikeouts * BATTER_MVP_WEIGHTS.strikeout +
    row.baserunningOuts * BATTER_MVP_WEIGHTS.baserunningOut +
    row.doublePlays * BATTER_MVP_WEIGHTS.doublePlay +
    row.steals * BATTER_MVP_WEIGHTS.steal +
    row.caughtStealing * BATTER_MVP_WEIGHTS.caughtStealing
  );
}

function calculatePitcherMVPScore(
  row: RawPitcherMVPTotals,
  nonEarnedRuns: number,
) {
  return (
    row.outs * PITCHER_MVP_WEIGHTS.out +
    row.wins * PITCHER_MVP_WEIGHTS.win +
    row.losses * PITCHER_MVP_WEIGHTS.loss +
    row.saves * PITCHER_MVP_WEIGHTS.save +
    row.strikeouts * PITCHER_MVP_WEIGHTS.strikeout +
    row.hitsAllowed * PITCHER_MVP_WEIGHTS.hitAllowed +
    row.homeRunsAllowed * PITCHER_MVP_WEIGHTS.homeRunAllowed +
    row.walks * PITCHER_MVP_WEIGHTS.walk +
    row.hbp * PITCHER_MVP_WEIGHTS.hitByPitch +
    row.balks * PITCHER_MVP_WEIGHTS.balk +
    row.earnedRuns * PITCHER_MVP_WEIGHTS.earnedRun +
    nonEarnedRuns * PITCHER_MVP_WEIGHTS.nonEarnedRun +
    calculatePitcherAchievementScore(row)
  );
}

function calculatePitcherAchievementScore(row: Pick<
  RawPitcherMVPTotals,
  "completeGames" | "shutouts" | "noHitters" | "perfectGames"
>) {
  const perfectGames = row.perfectGames;
  const noHitters = Math.max(0, row.noHitters - perfectGames);
  const shutouts = Math.max(0, row.shutouts - row.noHitters);
  const completeGames = Math.max(0, row.completeGames - row.shutouts);

  return (
    perfectGames * PITCHER_MVP_WEIGHTS.perfectGame +
    noHitters * PITCHER_MVP_WEIGHTS.noHitter +
    shutouts * PITCHER_MVP_WEIGHTS.shutout +
    completeGames * PITCHER_MVP_WEIGHTS.completeGame
  );
}

function inningsStringToOuts(value: string) {
  const [wholePart, partialPart] = value.split(".");
  const wholeInnings = Number(wholePart || 0);
  const remainderOuts = Number(partialPart || 0);

  return wholeInnings * 3 + remainderOuts;
}

function formatInningsFromOuts(outs: number) {
  if (outs <= 0) {
    return "0.0";
  }

  return `${Math.floor(outs / 3)}.${outs % 3}`;
}
