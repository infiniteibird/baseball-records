import type {
  StoredGame,
  StoredHitterStat,
  StoredPitcherStat,
} from "@/data/types";
import type { BatterRecordRow, SavedGameRecord } from "@/types/record";
import { recordCodeMap } from "@/lib/record-codes";
import { countPlateAppearances, splitPlateAppearances } from "@/lib/record-plate-appearances";
import { buildPitchingRowsFromAssignments } from "@/lib/pitching-calculator";

type RawHitterAccumulator = {
  name: string;
  teamId: string;
  games: number;
  pa: number;
  ab: number;
  runs: number;
  hits: number;
  hr: number;
  rbi: number;
  bb: number;
  so: number;
  sb: number;
  hbp: number;
  doubles: number;
  triples: number;
};

type RawPitcherAccumulator = {
  teamId: string;
  name: string;
  hitsAllowed: number;
  runs: number;
  earnedRuns: number;
  walks: number;
  hitByPitch: number;
  strikeouts: number;
  outs: number;
  homeRunsAllowed: number;
  batters: number;
  atBats: number;
  wins: number;
  losses: number;
  saves: number;
};

export function buildRecordedPlayerHittingStats(
  games: StoredGame[],
  records: Record<string, SavedGameRecord>,
): StoredHitterStat[] {
  const gameById = new Map(games.map((game) => [game.id, game]));
  const hitterMap = new Map<string, RawHitterAccumulator>();

  for (const [gameId, record] of Object.entries(records)) {
    const game = gameById.get(gameId);
    if (!game) {
      continue;
    }

    aggregateBattersByTeam(game.awayTeamId, record.away.batters, hitterMap);
    aggregateBattersByTeam(game.homeTeamId, record.home.batters, hitterMap);
  }

  return Array.from(hitterMap.values())
    .map((row) => {
      const avg = formatRate(row.hits, row.ab);
      const obp = formatRate(row.hits + row.bb + row.hbp, row.ab + row.bb + row.hbp);
      const singles = Math.max(0, row.hits - row.doubles - row.triples - row.hr);
      const totalBases = singles + row.doubles * 2 + row.triples * 3 + row.hr * 4;
      const slg = formatRate(totalBases, row.ab);

      return {
        id: `record-hitter-${row.teamId}-${row.name}`,
        player: row.name,
        teamId: row.teamId,
        team: row.teamId,
        avg,
        obp,
        slg,
        ops: formatRateString(sumRates(obp, slg)),
        games: row.games,
        pa: row.pa,
        ab: row.ab,
        hits: row.hits,
        hr: row.hr,
        doubles: row.doubles,
        triples: row.triples,
        rbi: row.rbi,
        runs: row.runs,
        steals: row.sb,
        bb: row.bb,
        hbp: row.hbp,
        so: row.so,
      } satisfies StoredHitterStat;
    })
    .sort((playerA, playerB) =>
      playerA.team === playerB.team
        ? playerA.player.localeCompare(playerB.player, "ko")
        : playerA.team.localeCompare(playerB.team, "ko"),
    );
}

export function buildRecordedPlayerPitchingStats(
  games: StoredGame[],
  records: Record<string, SavedGameRecord>,
): StoredPitcherStat[] {
  const gameById = new Map(games.map((game) => [game.id, game]));
  const pitcherMap = new Map<string, RawPitcherAccumulator>();

  for (const [gameId, record] of Object.entries(records)) {
    const game = gameById.get(gameId);
    if (!game) {
      continue;
    }

    const awayPitchingRows = buildPitchingRowsFromAssignments(
      "away",
      record.home.batters,
      record.away.pitchers,
      record.away.pitcherAssignments,
    );
    const homePitchingRows = buildPitchingRowsFromAssignments(
      "home",
      record.away.batters,
      record.home.pitchers,
      record.home.pitcherAssignments,
    );

    aggregatePitchingRows(awayPitchingRows, game.awayTeamId, pitcherMap);
    aggregatePitchingRows(homePitchingRows, game.homeTeamId, pitcherMap);
  }

  return Array.from(pitcherMap.values())
    .filter((row) => row.name.length > 0)
    .map((row) => {
      const ip = formatInningsFromOuts(row.outs);
      const inningsDecimal = outsToInningsDecimal(ip);

      return {
        id: `record-pitcher-${row.teamId}-${row.name}`,
        player: row.name,
        teamId: row.teamId,
        team: row.teamId,
        era: inningsDecimal === 0 ? "0.00" : (row.earnedRuns * 9 / inningsDecimal).toFixed(2),
        whip: inningsDecimal === 0
          ? "0.00"
          : ((row.walks + row.hitByPitch + row.hitsAllowed) / inningsDecimal).toFixed(2),
        ip,
        so: row.strikeouts,
        wins: row.wins,
        losses: row.losses,
        saves: row.saves,
      } satisfies StoredPitcherStat;
    })
    .sort((a, b) => {
      const teamCompare = a.team.localeCompare(b.team, "ko");
      if (teamCompare !== 0) {
        return teamCompare;
      }

      return a.player.localeCompare(b.player, "ko");
    });
}

function aggregateBattersByTeam(
  teamId: string,
  rows: BatterRecordRow[],
  hitterMap: Map<string, RawHitterAccumulator>,
) {
  for (const row of rows) {
    const name = row.playerName.trim();
    if (!name) {
      continue;
    }

    const key = toTeamPlayerKey(teamId, name);
    const current = hitterMap.get(key) ?? {
      name,
      teamId,
      games: 0,
      pa: 0,
      ab: 0,
      runs: 0,
      hits: 0,
      hr: 0,
      rbi: 0,
      bb: 0,
      so: 0,
      sb: 0,
      hbp: 0,
      doubles: 0,
      triples: 0,
    };

    const rowTotals = summarizeBatterRowForPlayerStats(row);
    if (hasRecordedBatterAppearance(row, rowTotals)) {
      current.games += 1;
    }

    current.pa += rowTotals.pa;
    current.ab += rowTotals.ab;
    current.runs += row.manualRuns ?? rowTotals.runs;
    current.hits += rowTotals.hits;
    current.hr += rowTotals.hr;
    current.rbi += row.manualRbi ?? rowTotals.rbi;
    current.bb += rowTotals.bb;
    current.so += rowTotals.so;
    current.sb += rowTotals.sb;
    current.hbp += rowTotals.hbp;
    current.doubles += rowTotals.doubles;
    current.triples += rowTotals.triples;

    hitterMap.set(key, current);
  }
}

function hasRecordedBatterAppearance(
  row: BatterRecordRow,
  totals: ReturnType<typeof summarizeBatterRowForPlayerStats>,
) {
  return (
    countPlateAppearances(row.inningResults.flatMap((entries) => entries)) > 0 ||
    row.manualRuns !== undefined ||
    row.manualRbi !== undefined ||
    totals.ab > 0 ||
    totals.hits > 0 ||
    totals.bb > 0 ||
    totals.hbp > 0 ||
    totals.so > 0 ||
    totals.sb > 0 ||
    totals.runs > 0 ||
    totals.rbi > 0
  );
}

function summarizeBatterRowForPlayerStats(row: BatterRecordRow) {
  return row.inningResults.reduce<{
    pa: number;
    ab: number;
    runs: number;
    hits: number;
    hr: number;
    rbi: number;
    bb: number;
    so: number;
    sb: number;
    hbp: number;
    doubles: number;
    triples: number;
  }>(
    (accumulator, cellEntries) => {
      const appearances = splitPlateAppearances(cellEntries);
      accumulator.pa += appearances.length;

      for (const plateAppearance of appearances) {
        for (const entry of plateAppearance) {
          const definition = recordCodeMap.get(entry.code);
          if (!definition) {
            continue;
          }

          switch (definition.category) {
            case "single":
              accumulator.hits += 1;
              accumulator.ab += 1;
              break;
            case "double":
              accumulator.hits += 1;
              accumulator.doubles += 1;
              accumulator.ab += 1;
              break;
            case "triple":
              accumulator.hits += 1;
              accumulator.triples += 1;
              accumulator.ab += 1;
              break;
            case "home_run":
              accumulator.hits += 1;
              accumulator.hr += 1;
              accumulator.rbi += 1;
              accumulator.runs += 1;
              accumulator.ab += 1;
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
              break;
            case "strikeout_reached":
              accumulator.so += 1;
              accumulator.ab += 1;
              break;
            case "groundout":
            case "out":
            case "double_play":
            case "error":
            case "fielders_choice":
              accumulator.ab += 1;
              break;
            case "rbi":
              accumulator.rbi += 1;
              break;
            case "run_scored":
              accumulator.runs += 1;
              break;
            case "steal":
              accumulator.sb += 1;
              break;
            default:
              break;
          }
        }
      }

      return accumulator;
    },
    {
      pa: 0,
      ab: 0,
      runs: 0,
      hits: 0,
      hr: 0,
      rbi: 0,
      bb: 0,
      so: 0,
      sb: 0,
      hbp: 0,
      doubles: 0,
      triples: 0,
    },
  );
}

function aggregatePitchingRows(
  pitchingRows: Array<{
    name: string;
    hitsAllowed: number;
    runs: number;
    earnedRuns: number;
    walks: number;
    strikeouts: number;
    homeRunsAllowed: number;
    batters: number;
    atBats: number;
    pitches: number;
    ip: string;
    win: string;
    loss: string;
    save: string;
  }>,
  teamId: string,
  pitcherMap: Map<string, RawPitcherAccumulator>,
) {
  for (const row of pitchingRows) {
    const name = row.name.trim();
    if (!name) {
      continue;
    }

    const key = toTeamPlayerKey(teamId, name);
    const base = pitcherMap.get(key) ?? {
      teamId,
      name,
      hitsAllowed: 0,
      runs: 0,
      earnedRuns: 0,
      walks: 0,
      hitByPitch: 0,
      strikeouts: 0,
      outs: 0,
      homeRunsAllowed: 0,
      batters: 0,
      atBats: 0,
      wins: 0,
      losses: 0,
      saves: 0,
    };

    pitcherMap.set(key, {
      ...base,
      hitsAllowed: base.hitsAllowed + row.hitsAllowed,
      runs: base.runs + row.runs,
      earnedRuns: base.earnedRuns + row.earnedRuns,
      walks: base.walks + row.walks,
      strikeouts: base.strikeouts + row.strikeouts,
      outs: base.outs + (Number(row.ip.split(".")[0]) * 3 + Number(row.ip.split(".")[1] ?? 0)),
      homeRunsAllowed: base.homeRunsAllowed + row.homeRunsAllowed,
      batters: base.batters + row.batters,
      atBats: base.atBats + row.atBats,
      wins: base.wins + (row.win === "승" ? 1 : 0),
      losses: base.losses + (row.loss === "패" ? 1 : 0),
      saves: base.saves + (row.save === "세" ? 1 : 0),
    });
  }
}

function formatRate(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return ".000";
  }

  const ratio = Math.round((numerator / denominator) * 1000) / 1000;
  const fixed = ratio.toFixed(3);

  if (ratio >= 1) {
    return fixed;
  }

  return `.${fixed.slice(2)}`;
}

function sumRates(first: string, second: string) {
  const firstValue = Number(first);
  const secondValue = Number(second);

  if (Number.isNaN(firstValue) || Number.isNaN(secondValue)) {
    return 0;
  }

  return firstValue + secondValue;
}

function formatRateString(value: number) {
  if (Number.isNaN(value)) {
    return ".000";
  }

  return value.toFixed(3);
}

function formatInningsFromOuts(outs: number) {
  if (outs <= 0) {
    return "0.0";
  }

  return `${Math.floor(outs / 3)}.${outs % 3}`;
}

function outsToInningsDecimal(innings: string) {
  const [full = "0", partial = "0"] = innings.split(".");
  return Number(full) + Number(partial) / 3;
}

function toTeamPlayerKey(teamId: string, playerName: string) {
  return `${teamId}::${playerName.toLowerCase().trim()}`;
}
