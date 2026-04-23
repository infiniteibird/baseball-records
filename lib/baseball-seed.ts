import { gameListItems } from "@/data/mock-games";
import { mockTeams } from "@/data/mock-teams";
import type { BaseballPersistPayload } from "@/types/baseball-persistence";

function extractTeamIdByName(teamName: string) {
  const team = mockTeams.find((current) => current.name === teamName);
  return team?.id ?? teamName;
}

export function buildSeedPayload(): BaseballPersistPayload {
  const teams = mockTeams.map((team) => ({
    ...team,
    players: [...team.players],
  }));

  const games = gameListItems.map((game) => ({
    id: game.id,
    date: game.date,
    time: game.time,
    stadium: game.stadium,
    status: game.status,
    awayTeamId: extractTeamIdByName(game.awayTeam),
    homeTeamId: extractTeamIdByName(game.homeTeam),
    awayScore: game.awayScore,
    homeScore: game.homeScore,
    note: game.note,
    source: "mock",
    detailAvailable: true,
    createdAt: `${game.date.replaceAll(".", "-")}T${game.time}`,
  }));

  return {
    teams,
    games,
    uploadedPlayers: [],
    records: {},
    source: "mock",
  };
}

