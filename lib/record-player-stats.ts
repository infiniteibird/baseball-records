import type {
  StoredGame,
  StoredHitterStat,
  StoredPitcherStat,
} from "@/data/types";
import type { BatterRecordRow, SavedGameRecord } from "@/types/record";
import { recordCodeMap } from "@/lib/record-codes";
import { buildPitchingRowsFromAssignments } from "@/lib/pitching-calculator";

type RawHitterAccumulator = {
  name: string;
  teamId: string;
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
        hits: row.hits,
        hr: row.hr,
        rbi: row.rbi,
        steals: row.sb,
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
        wins: 0,
        losses: 0,
        saves: 0,
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

    for (const cellEntries of row.inningResults) {
      for (const entry of cellEntries) {
        const definition = recordCodeMap.get(entry.code);
        if (!definition) {
          continue;
        }

        switch (definition.category) {
          case "single":
            current.hits += 1;
            current.ab += 1;
            break;
          case "double":
            current.hits += 1;
            current.doubles += 1;
            current.ab += 1;
            break;
          case "triple":
            current.hits += 1;
            current.triples += 1;
            current.ab += 1;
            break;
          case "home_run":
            current.hits += 1;
            current.hr += 1;
            current.rbi += 1;
            current.runs += 1;
            current.ab += 1;
            break;
          case "walk":
          case "intentional_walk":
            current.bb += 1;
            break;
          case "hit_by_pitch":
            current.hbp += 1;
            break;
          case "strikeout":
            current.so += 1;
            current.ab += 1;
            break;
          case "groundout":
          case "out":
            current.ab += 1;
            break;
          case "double_play":
            current.ab += 1;
            break;
          case "error":
          case "fielders_choice":
            current.ab += 1;
            break;
          case "rbi":
            current.rbi += 1;
            break;
          case "run_scored":
            current.runs += 1;
            break;
          case "steal":
            current.sb += 1;
            break;
          default:
            break;
        }
      }
    }

    hitterMap.set(key, current);
  }
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
    });
  }
}

function formatRate(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return "0.000";
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
