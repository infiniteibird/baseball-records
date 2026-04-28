import type {
  HitterStatsRow,
  PitcherStatsRow,
  StoredGame,
  TeamConfig,
} from "@/data/types";

export function buildTeamFinishedGameCounts(
  games: StoredGame[],
  teams: TeamConfig[],
) {
  const teamNameById = new Map(
    teams.map((team) => [team.id, team.name] as const),
  );
  const counts = new Map<string, number>();

  games.forEach((game) => {
    if (
      game.status !== "종료" ||
      game.homeScore === null ||
      game.awayScore === null
    ) {
      return;
    }

    const homeTeam = teamNameById.get(game.homeTeamId);
    const awayTeam = teamNameById.get(game.awayTeamId);

    if (homeTeam) {
      counts.set(homeTeam, (counts.get(homeTeam) ?? 0) + 1);
    }

    if (awayTeam) {
      counts.set(awayTeam, (counts.get(awayTeam) ?? 0) + 1);
    }
  });

  return Object.fromEntries(Array.from(counts.entries()));
}

export function buildTeamPlateAppearanceMinimums(
  teamFinishedGameCounts: Record<string, number>,
) {
  return Object.fromEntries(
    Object.entries(teamFinishedGameCounts).map(([team, games]) => [
      team,
      games * 2,
    ]),
  );
}

export function inningsStringToOuts(value: string) {
  const [wholePart, partialPart] = value.split(".");
  const wholeInnings = Number(wholePart || 0);
  const remainderOuts = Number(partialPart || 0);

  return wholeInnings * 3 + remainderOuts;
}

export function toRequiredPitcherQualificationOuts(teamGames: number) {
  return teamGames * inningsStringToOuts("1.2");
}

export function isQualifiedHitter(
  player: HitterStatsRow,
  teamPlateAppearanceMinimums: Record<string, number>,
) {
  return player.pa >= (teamPlateAppearanceMinimums[player.team] ?? 0);
}

export function isQualifiedPitcher(
  player: PitcherStatsRow,
  teamFinishedGameCounts: Record<string, number>,
) {
  const teamGames = teamFinishedGameCounts[player.team] ?? 0;
  return (
    inningsStringToOuts(player.ip) >=
    toRequiredPitcherQualificationOuts(teamGames)
  );
}
