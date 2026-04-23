"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import {
  applyRecordToGame,
  buildGameDetailFromRecord,
} from "@/lib/record-calculators";
import {
  buildRecordedPlayerHittingStats,
  buildRecordedPlayerPitchingStats,
} from "@/lib/record-player-stats";
import { recordCodeMap } from "@/lib/record-codes";
import {
  mockHitterLeaders,
  mockPitcherLeaders,
} from "@/data/mock-players";
import { gameListItems } from "@/data/mock-games";
import { mockTeams } from "@/data/mock-teams";
import type {
  BaseballState,
  DisplayGame,
  RecentResultCard,
  StandingsRow,
  StoredGame,
  StoredHitterStat,
  StoredPitcherStat,
  TeamConfig,
  TodayGameCard,
  UploadedPlayer,
} from "@/data/types";
import type { SavedGameRecord } from "@/types/record";
import type { BatterRecordRow, PitcherRecordRow } from "@/types/record";

type BaseballAction =
  | {
      type: "hydrate";
      payload: BaseballState;
    }
  | {
      type: "replace_games";
      payload: StoredGame[];
    }
  | {
      type: "save_record";
      payload: SavedGameRecord;
    }
  | {
      type: "append_uploaded_players";
      payload: UploadedPlayer[];
    }
  | {
      type: "remove_uploaded_players";
      payload: string[];
    }
  | {
      type: "remove_roster_players";
      payload: UploadedPlayer[];
    }
  | {
      type: "replace_teams";
      payload: TeamConfig[];
    }
  | {
      type: "reset";
    };

type BaseballContextValue = {
  state: BaseballState;
  isHydrated: boolean;
  teamOptions: string[];
  recentGames: DisplayGame[];
  upcomingGames: DisplayGame[];
  todayGames: TodayGameCard[];
  recentResults: RecentResultCard[];
  standings: StandingsRow[];
  recentAdminGames: DisplayGame[];
  displayHitters: StoredHitterStat[];
  displayPitchers: StoredPitcherStat[];
  rosterPlayers: UploadedPlayer[];
  playerTeams: string[];
  hitterLeaders: typeof mockHitterLeaders;
  pitcherLeaders: typeof mockPitcherLeaders;
  saveGames: (games: StoredGame[]) => void;
  saveGameRecord: (
    gameId: string,
    record: SavedGameRecord,
    saveStatus: "draft" | "saved",
  ) => void;
  getRecordDetailByGameId: (gameId: string) => ReturnType<typeof buildGameDetailFromRecord> | null;
  saveTeams: (teams: TeamConfig[]) => void;
  importUploadedPlayers: (players: UploadedPlayer[]) => void;
  removeUploadedPlayers: (playerIds: string[]) => void;
  removeRosterPlayers: (players: UploadedPlayer[]) => void;
  resetState: () => void;
};

const STORAGE_KEY = "baseball-records-store-v1";

const BaseballContext = createContext<BaseballContextValue | null>(null);

export function BaseballProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [state, dispatch] = useReducer(
    baseballReducer,
    undefined,
    createInitialState,
  );
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = normalizePersistedState(JSON.parse(raw) as Partial<BaseballState>);
        dispatch({
          type: "hydrate",
          payload: parsed,
        });
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [isHydrated, state]);

  const value = useMemo<BaseballContextValue>(() => {
    const teamNameMap = new Map(
      state.teams.map((team) => [team.id, team.name] as const),
    );
    const displayGames = state.games
      .map<DisplayGame>((game) => ({
        ...game,
        awayTeam: teamNameMap.get(game.awayTeamId) ?? game.awayTeamId,
        homeTeam: teamNameMap.get(game.homeTeamId) ?? game.homeTeamId,
      }))
      .sort(compareGamesDesc);

    const recentGames = displayGames.filter((game) => game.status === "종료");
    const upcomingGames = displayGames.filter((game) => game.status !== "종료");

    const todayGames = upcomingGames.slice(0, 3).map((game) => ({
      time: game.time,
      league: "교내 리그",
      stadium: game.stadium,
      home: game.homeTeam,
      away: game.awayTeam,
      status: game.status,
    }));

    const recentResults = recentGames.slice(0, 3).map((game) => ({
      date: game.date.slice(5).replaceAll(".", "."),
      home: game.homeTeam,
      away: game.awayTeam,
      score: `${game.awayScore ?? "-"} : ${game.homeScore ?? "-"}`,
      note: game.note,
    }));

    const standings = calculateStandings(
      state.games,
      state.teams,
      state.records,
    );

    const recentAdminGames = displayGames
      .filter((game) => game.source === "admin")
      .slice(0, 5);

    const recordedHitters = buildRecordedPlayerHittingStats(state.games, state.records);
    const recordedPitchers = buildRecordedPlayerPitchingStats(state.games, state.records);

    const participationKeys = buildParticipationKeys(state.games, state.records);

    const displayHitters = mergeRecordedPlayerStats(
      buildRosterBaseHitters(state.teams),
      recordedHitters,
      teamNameMap,
    ).filter((player) =>
      participationKeys.hitting.has(toPlayerTeamKey(player.teamId, player.player)),
    );

    const displayPitchers = mergeRecordedPlayerStats(
      buildRosterBasePitchers(state.teams),
      recordedPitchers,
      teamNameMap,
    ).filter((player) =>
      participationKeys.pitching.has(toPlayerTeamKey(player.teamId, player.player)),
    );

    const rosterPlayers = mergeRosterPlayers(state.teams, state.uploadedPlayers);
    const playerTeams = Array.from(
      new Set(state.teams.map((team) => team.name)),
    ).sort();

    const displayHitterLeaders = mockHitterLeaders.map((leader) => ({
      ...leader,
      team: findDisplayTeamName(leader.team, state.teams),
    }));

    const displayPitcherLeaders = mockPitcherLeaders.map((leader) => ({
      ...leader,
      team: findDisplayTeamName(leader.team, state.teams),
    }));

    return {
      state,
      isHydrated,
      teamOptions: state.teams.map((team) => team.name),
      recentGames,
      upcomingGames,
      todayGames,
      recentResults,
      standings,
      recentAdminGames,
      displayHitters,
      displayPitchers,
      rosterPlayers,
      playerTeams,
      hitterLeaders: displayHitterLeaders,
      pitcherLeaders: displayPitcherLeaders,
      saveGames(games) {
        dispatch({
          type: "replace_games",
          payload: cloneGames(games),
        });
      },
      saveGameRecord(gameId, record, saveStatus) {
        const matchedGame = state.games.find((game) => game.id === gameId);
        if (!matchedGame) {
          return;
        }

        const nextRecord = {
          ...record,
          saveStatus,
          updatedAt: new Date().toISOString(),
        } satisfies SavedGameRecord;

        dispatch({
          type: "replace_games",
          payload: state.games.map((game) =>
            game.id === gameId
              ? applyRecordToGame(game, state.teams, nextRecord, saveStatus)
              : game,
          ),
        });
        dispatch({
          type: "save_record",
          payload: nextRecord,
        });
      },
      getRecordDetailByGameId(gameId) {
        const matchedGame = state.games.find((game) => game.id === gameId);
        const matchedRecord = state.records[gameId];

        if (!matchedGame || !matchedRecord) {
          return null;
        }

        return buildGameDetailFromRecord(matchedGame, state.teams, matchedRecord);
      },
      saveTeams(teams) {
        dispatch({
          type: "replace_teams",
          payload: cloneTeams(teams),
        });
      },
      importUploadedPlayers(players) {
        dispatch({
          type: "append_uploaded_players",
          payload: cloneUploadedPlayers(players),
        });
      },
      removeUploadedPlayers(playerIds) {
        dispatch({
          type: "remove_uploaded_players",
          payload: [...playerIds],
        });
      },
      removeRosterPlayers(players) {
        dispatch({
          type: "remove_roster_players",
          payload: cloneUploadedPlayers(players),
        });
      },
      resetState() {
        dispatch({
          type: "reset",
        });
      },
    };
  }, [isHydrated, state]);

  return (
    <BaseballContext.Provider value={value}>{children}</BaseballContext.Provider>
  );
}

export function useBaseballData() {
  const context = useContext(BaseballContext);

  if (!context) {
    throw new Error("useBaseballData must be used within BaseballProvider.");
  }

  return context;
}

function createInitialState(): BaseballState {
  const teams = cloneTeams(mockTeams);
  const teamIdByName = new Map(teams.map((team) => [team.name, team.id] as const));

  return {
    teams,
    games: gameListItems.map((game) => ({
      id: game.id,
      date: game.date,
      time: game.time,
      stadium: game.stadium,
      status: game.status,
      awayTeamId: teamIdByName.get(game.awayTeam) ?? game.awayTeam,
      homeTeamId: teamIdByName.get(game.homeTeam) ?? game.homeTeam,
      awayScore: game.awayScore,
      homeScore: game.homeScore,
      note: game.note,
      source: "mock",
      detailAvailable: true,
      createdAt: createComparableDate(game.date, game.time),
    })),
    hitters: [],
    pitchers: [],
    records: {},
    uploadedPlayers: [],
  };
}

function normalizePersistedState(
  persistedState: Partial<BaseballState>,
): BaseballState {
  const initialState = createInitialState();

  return {
    teams: persistedState.teams ? cloneTeams(persistedState.teams) : initialState.teams,
    games: persistedState.games ? cloneGames(persistedState.games) : initialState.games,
    hitters: persistedState.hitters ?? initialState.hitters,
    pitchers: persistedState.pitchers ?? initialState.pitchers,
    records: persistedState.records ? cloneRecords(persistedState.records) : {},
    uploadedPlayers: persistedState.uploadedPlayers
      ? cloneUploadedPlayers(persistedState.uploadedPlayers)
      : [],
  };
}

function cloneTeams(teams: TeamConfig[]) {
  return teams.map((team) => ({
    ...team,
    players: [...team.players],
  }));
}

function cloneGames(games: StoredGame[]) {
  return games.map((game) => ({
    ...game,
  }));
}

function cloneRecords(records: Record<string, SavedGameRecord>) {
  return Object.fromEntries(
    Object.entries(records).map(([gameId, record]) => [
      gameId,
      structuredClone(record),
    ]),
  );
}

function cloneUploadedPlayers(players: UploadedPlayer[]) {
  return players.map((player) => ({
    ...player,
    raw: player.raw ? { ...player.raw } : undefined,
  }));
}

function baseballReducer(
  state: BaseballState,
  action: BaseballAction,
): BaseballState {
  switch (action.type) {
    case "hydrate":
      return action.payload;
    case "replace_games":
      return {
        ...state,
        games: cloneGames(action.payload),
      };
    case "save_record":
      return {
        ...state,
        records: {
          ...cloneRecords(state.records),
          [action.payload.gameId]: structuredClone(action.payload),
        },
      };
    case "append_uploaded_players":
      return {
        ...state,
        teams: appendUploadedPlayersToTeams(state.teams, action.payload),
        uploadedPlayers: [
          ...cloneUploadedPlayers(state.uploadedPlayers),
          ...cloneUploadedPlayers(action.payload),
        ],
      };
    case "remove_uploaded_players": {
      const removeSet = new Set(action.payload);
      const removedPlayers = state.uploadedPlayers.filter((player) =>
        removeSet.has(player.id),
      );

      return {
        ...state,
        teams: removePlayersFromTeams(state.teams, removedPlayers),
        uploadedPlayers: cloneUploadedPlayers(
          state.uploadedPlayers.filter((player) => !removeSet.has(player.id)),
        ),
      };
    }
    case "remove_roster_players": {
      const removePlayerIds = new Set(action.payload.map((player) => player.id));
      const nextUploadedPlayers = state.uploadedPlayers.filter(
        (player) => !removePlayerIds.has(player.id),
      );

      return {
        ...state,
        teams: removePlayersFromTeams(state.teams, action.payload),
        uploadedPlayers: cloneUploadedPlayers(nextUploadedPlayers),
      };
    }
    case "replace_teams":
      return {
        ...state,
        teams: cloneTeams(action.payload),
      };
    case "reset":
      return createInitialState();
    default:
      return state;
  }
}

export function calculateStandings(
  games: StoredGame[],
  teams: TeamConfig[],
  records: Record<string, SavedGameRecord>,
  options?: { season?: number },
): StandingsRow[] {
  const recordsByGame = new Map<string, SavedGameRecord>(Object.entries(records));
  const targetSeason = options?.season;
  const finishedGames = games.filter((game) => {
    const gameSeason = getDateSeason(game.date);
    const seasonMatch =
      targetSeason == null || gameSeason === String(targetSeason);

    return (
      game.status === "종료" &&
      game.homeScore !== null &&
      game.awayScore !== null &&
      seasonMatch
    );
  });

  const baseRows: StandingsAccumulator[] = teams.map((team) => ({
    rank: 0,
    team: team.name,
    teamId: team.id,
    games: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    points: 0,
    winRate: "0.000",
    runsFor: 0,
    runsAgainst: 0,
    offenseOuts: 0,
    defenseOuts: 0,
    onBase: 0,
    plateAppearances: 0,
    offenseInnings: "0.0",
    defenseInnings: "0.0",
    scoringRate: 0,
    runAllowedRate: 0,
    onBaseRate: 0,
    offenseHasData: false,
    defenseHasData: false,
  }));

  const rowByTeamId = new Map(baseRows.map((row) => [row.teamId, row]));

  finishedGames.forEach((game) => {
    const homeRow = rowByTeamId.get(game.homeTeamId);
    const awayRow = rowByTeamId.get(game.awayTeamId);
    const record = recordsByGame.get(game.id);

    if (!homeRow || !awayRow || game.homeScore === null || game.awayScore === null) {
      return;
    }

    homeRow.games += 1;
    awayRow.games += 1;
    homeRow.runsFor += game.homeScore;
    homeRow.runsAgainst += game.awayScore;
    awayRow.runsFor += game.awayScore;
    awayRow.runsAgainst += game.homeScore;
    if (record) {
      addTeamOffenseTotals(game.homeTeamId, record.home.batters, homeRow);
      addTeamDefenseTotals(game.homeTeamId, record.away.batters, homeRow);
      addTeamOffenseTotals(game.awayTeamId, record.away.batters, awayRow);
      addTeamDefenseTotals(game.awayTeamId, record.home.batters, awayRow);
    }

    if (game.homeScore > game.awayScore) {
      homeRow.wins += 1;
      homeRow.points += 3;
      awayRow.losses += 1;
    } else if (game.homeScore < game.awayScore) {
      awayRow.wins += 1;
      awayRow.points += 3;
      homeRow.losses += 1;
    } else {
      homeRow.draws += 1;
      awayRow.draws += 1;
      homeRow.points += 1;
      awayRow.points += 1;
    }
  });

  const sortedRows = baseRows
    .map((row) => ({
      ...row,
      winRate:
        row.wins + row.losses === 0
          ? "0.000"
          : (row.wins / (row.wins + row.losses)).toFixed(3),
      offenseOuts: row.offenseHasData ? row.offenseOuts : row.games * 27,
      defenseOuts: row.defenseHasData ? row.defenseOuts : row.games * 27,
      offenseInnings: formatInningsFromOuts(
        row.offenseHasData ? row.offenseOuts : row.games * 27,
      ),
      defenseInnings: formatInningsFromOuts(
        row.defenseHasData ? row.defenseOuts : row.games * 27,
      ),
      scoringRate: computePerInningRate(
        row.runsFor,
        row.offenseHasData ? row.offenseOuts : row.games * 27,
      ),
      runAllowedRate: computePerInningRate(
        row.runsAgainst,
        row.defenseHasData ? row.defenseOuts : row.games * 27,
      ),
      onBaseRate: row.plateAppearances === 0 ? 0 : row.onBase / row.plateAppearances,
    }))
    .sort((rowA, rowB) => {
      if (rowB.points !== rowA.points) {
        return rowB.points - rowA.points;
      }

      const runAllowedRateDiff = rowA.runAllowedRate - rowB.runAllowedRate;
      if (runAllowedRateDiff !== 0) {
        return runAllowedRateDiff;
      }

      const scoringRateDiff = rowB.scoringRate - rowA.scoringRate;
      if (scoringRateDiff !== 0) {
        return scoringRateDiff;
      }

      const onBaseRateDiff = rowB.onBaseRate - rowA.onBaseRate;
      if (onBaseRateDiff !== 0) {
        return onBaseRateDiff;
      }

      const winRateDiff = Number(rowB.winRate) - Number(rowA.winRate);
      return winRateDiff;
    });

  return sortedRows.map((row, index) => ({
    ...row,
    rank: index + 1,
  }));
}

function getDateSeason(date: string) {
  const match = date.match(/(20\d{2})/);

  return match ? match[1] : "";
}

type StandingsAccumulator = {
  rank: number;
  team: string;
  teamId: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  winRate: string;
  runsFor: number;
  runsAgainst: number;
  offenseOuts: number;
  defenseOuts: number;
  onBase: number;
  plateAppearances: number;
  offenseInnings: string;
  defenseInnings: string;
  scoringRate: number;
  runAllowedRate: number;
  onBaseRate: number;
  offenseHasData: boolean;
  defenseHasData: boolean;
};

function addTeamOffenseTotals(
  teamId: string,
  batters: Array<{ inningResults: Array<Array<{ code: string }>> }>,
  accumulator: StandingsAccumulator,
) {
  if (accumulator.teamId !== teamId) {
    return;
  }

  batters.forEach((batter) => {
    if (batter.inningResults.length > 0) {
      accumulator.offenseHasData = true;
      accumulator.plateAppearances += batter.inningResults.length;
    }

    batter.inningResults.forEach((entries) => {
      let countedOnBase = false;

      entries.forEach((entry) => {
        const definition = recordCodeMap.get(entry.code);
        if (!definition) {
          return;
        }

        accumulator.offenseOuts += inningsFromRecordDefinition(definition.category);
        if (!countedOnBase && isOnBaseCategory(definition.category)) {
          accumulator.onBase += 1;
          countedOnBase = true;
        }
      });
    });
  });
}

function addTeamDefenseTotals(
  teamId: string,
  batters: Array<{ inningResults: Array<Array<{ code: string }>> }>,
  accumulator: StandingsAccumulator,
) {
  if (accumulator.teamId !== teamId) {
    return;
  }

  batters.forEach((batter) => {
    batter.inningResults.forEach((entries) => {
      if (entries.length > 0) {
        accumulator.defenseHasData = true;
      }

      entries.forEach((entry) => {
        const definition = recordCodeMap.get(entry.code);
        if (!definition) {
          return;
        }

        accumulator.defenseOuts += inningsFromRecordDefinition(definition.category);
      });
    });
  });
}

function inningsFromRecordDefinition(category: string) {
  switch (category) {
    case "double_play":
      return 2;
    case "out":
    case "groundout":
    case "strikeout":
    case "sac_bunt":
    case "sac_fly":
      return 1;
    default:
      return 0;
  }
}

function isOnBaseCategory(category: string) {
  return (
    category === "single" ||
    category === "double" ||
    category === "triple" ||
    category === "home_run" ||
    category === "walk" ||
    category === "intentional_walk" ||
    category === "hit_by_pitch"
  );
}

function computePerInningRate(events: number, outs: number) {
  if (outs <= 0) {
    return 0;
  }

  const innings = formatInningsDecimalFromOuts(outs);
  if (innings <= 0) {
    return 0;
  }

  return events / innings;
}

function formatInningsFromOuts(outs: number) {
  if (outs <= 0) {
    return "0.0";
  }

  const whole = Math.floor(outs / 3);
  const remainder = outs % 3;
  return `${whole}.${remainder}`;
}

function formatInningsDecimalFromOuts(outs: number) {
  const whole = Math.floor(outs / 3);
  const remainder = outs % 3;
  return whole + remainder / 3;
}

function buildParticipationKeys(
  games: StoredGame[],
  records: Record<string, SavedGameRecord>,
) {
  const gameById = new Map(games.map((game) => [game.id, game]));

  const hitting = new Set<string>();
  const pitching = new Set<string>();

  Object.entries(records).forEach(([gameId, record]: [string, SavedGameRecord]) => {
    const game = gameById.get(gameId);
    if (!game) {
      return;
    }

    addBattersToParticipation(game.awayTeamId, record.away.batters, hitting);
    addBattersToParticipation(game.homeTeamId, record.home.batters, hitting);
    addPitchersToParticipation(game.awayTeamId, record.away.pitchers, pitching);
    addPitchersToParticipation(game.homeTeamId, record.home.pitchers, pitching);
  });

  return { hitting, pitching };
}

function addBattersToParticipation(
  teamId: string,
  batters: BatterRecordRow[],
  hitting: Set<string>,
) {
  batters.forEach((batter) => {
    const name = batter.playerName.trim();
    if (!name) {
      return;
    }

    hitting.add(toPlayerTeamKey(teamId, name));
  });
}

function addPitchersToParticipation(
  teamId: string,
  pitchers: PitcherRecordRow[],
  pitching: Set<string>,
) {
  pitchers.forEach((pitcher) => {
    const name = pitcher.name.trim();
    if (!name) {
      return;
    }

    pitching.add(toPlayerTeamKey(teamId, name));
  });
}

function compareGamesDesc(gameA: DisplayGame, gameB: DisplayGame) {
  const valueA = createComparableDate(gameA.date, gameA.time);
  const valueB = createComparableDate(gameB.date, gameB.time);
  return valueB.localeCompare(valueA);
}

function createComparableDate(date: string, time: string) {
  const normalizedDate = date.replaceAll(".", "-");
  return `${normalizedDate}T${time}`;
}

function findDisplayTeamName(teamName: string, teams: TeamConfig[]) {
  const matchedTeam = teams.find((team) => team.name === teamName);
  if (matchedTeam) {
    return matchedTeam.name;
  }

  const fallback = teams.find((team) => team.name.includes(teamName));
  return fallback?.name ?? teamName;
}

function mergeRecordedPlayerStats<
  T extends { id: string; player: string; teamId: string; team: string },
>(
  baseRows: T[],
  recordedRows: T[],
  teamNameMap: Map<string, string>,
) {
  const merged = new Map<string, T>();
  const registeredKeys = new Set<string>();

  baseRows.forEach((row) => {
    const key = toPlayerTeamKey(row.teamId, row.player);
    registeredKeys.add(key);
    merged.set(key, {
      ...row,
      team: teamNameMap.get(row.teamId) ?? row.team,
    });
  });

  recordedRows.forEach((row) => {
    const key = toPlayerTeamKey(row.teamId, row.player);
    if (!registeredKeys.has(key)) {
      return;
    }

    merged.set(key, {
      ...row,
      team: teamNameMap.get(row.teamId) ?? row.team,
    });
  });

  return Array.from(merged.values()).sort((a, b) => {
    if (a.team !== b.team) {
      return a.team.localeCompare(b.team, "ko");
    }

    return a.player.localeCompare(b.player, "ko");
  });
}

function buildRosterBaseHitters(teams: TeamConfig[]) {
  const baseRows: StoredHitterStat[] = [];
  const seen = new Set<string>();

  teams.forEach((team) => {
    team.players.forEach((playerName) => {
      const key = toPlayerTeamKey(team.id, playerName);
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      baseRows.push({
        id: `template-hitter-${team.id}-${playerName}`,
        player: playerName,
        teamId: team.id,
        team: team.name,
        avg: ".000",
        obp: ".000",
        slg: ".000",
        ops: ".000",
        hits: 0,
        hr: 0,
        rbi: 0,
        steals: 0,
      });
    });
  });

  return baseRows;
}

function buildRosterBasePitchers(teams: TeamConfig[]) {
  const baseRows: StoredPitcherStat[] = [];
  const seen = new Set<string>();

  teams.forEach((team) => {
    team.players.forEach((playerName) => {
      const key = toPlayerTeamKey(team.id, playerName);
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      baseRows.push({
        id: `template-pitcher-${team.id}-${playerName}`,
        player: playerName,
        teamId: team.id,
        team: team.name,
        era: "0.00",
        whip: "0.00",
        ip: "0.0",
        so: 0,
        wins: 0,
        losses: 0,
        saves: 0,
      });
    });
  });

  return baseRows;
}

function toPlayerTeamKey(teamId: string, playerName: string) {
  return `${teamId}::${playerName.toLowerCase().trim()}`;
}

function mergeRosterPlayers(
  teams: TeamConfig[],
  uploadedPlayers: UploadedPlayer[],
) {
  const basePlayers = teams.flatMap((team) =>
    team.players.map(
      (playerName, index) =>
        ({
          id: `mock-roster-${team.id}-${index}`,
          name: playerName,
          school: "미등록",
          teamId: team.id,
          teamName: team.name,
          source: "mock",
        }) satisfies UploadedPlayer,
    ),
  );

  const mergedMap = new Map<string, UploadedPlayer>();

  basePlayers.forEach((player) => {
    mergedMap.set(`${player.teamId || player.teamName}::${player.name}`, player);
  });

  uploadedPlayers.forEach((player) => {
    mergedMap.set(`${player.teamId || player.teamName}::${player.name}`, {
      ...player,
      teamName:
        teams.find((team) => team.id === player.teamId)?.name ||
        player.teamName ||
        "미지정",
    });
  });

  return Array.from(mergedMap.values()).sort((playerA, playerB) => {
    const teamCompare = (playerA.teamName || "").localeCompare(
      playerB.teamName || "",
    );

    if (teamCompare !== 0) {
      return teamCompare;
    }

    return playerA.name.localeCompare(playerB.name);
  });
}

function appendUploadedPlayersToTeams(
  teams: TeamConfig[],
  uploadedPlayers: UploadedPlayer[],
) {
  const playersByTeamId = new Map<string, string[]>();

  uploadedPlayers.forEach((player) => {
    if (!player.teamId || !player.name.trim()) {
      return;
    }

    const teamPlayers = playersByTeamId.get(player.teamId) ?? [];
    teamPlayers.push(player.name.trim());
    playersByTeamId.set(player.teamId, teamPlayers);
  });

  return teams.map((team) => {
    const uploadedNames = playersByTeamId.get(team.id);

    if (!uploadedNames) {
      return {
        ...team,
        players: [...team.players],
      };
    }

    const existingNames = new Set(team.players.map(normalizePlayerName));
    const nextPlayers = [...team.players];

    uploadedNames.forEach((playerName) => {
      const normalizedName = normalizePlayerName(playerName);

      if (existingNames.has(normalizedName)) {
        return;
      }

      existingNames.add(normalizedName);
      nextPlayers.push(playerName);
    });

    return {
      ...team,
      players: nextPlayers,
    };
  });
}

function removePlayersFromTeams(
  teams: TeamConfig[],
  removedPlayers: UploadedPlayer[],
) {
  if (removedPlayers.length === 0) {
    return teams;
  }

  const removeCountsByTeam = new Map<string, Map<string, number>>();

  removedPlayers.forEach((player) => {
    if (!player.teamId || !player.name.trim()) {
      return;
    }

    const normalizedName = normalizePlayerName(player.name);
    const teamMap = removeCountsByTeam.get(player.teamId) ?? new Map<string, number>();
    teamMap.set(normalizedName, (teamMap.get(normalizedName) ?? 0) + 1);
    removeCountsByTeam.set(player.teamId, teamMap);
  });

  if (removeCountsByTeam.size === 0) {
    return teams;
  }

  return teams.map((team) => {
    const teamRemoveMap = removeCountsByTeam.get(team.id);
    if (!teamRemoveMap) {
      return {
        ...team,
        players: [...team.players],
      };
    }

    const removedCountMap = new Map(teamRemoveMap);
    const nextPlayers: string[] = [];

    for (const name of team.players) {
      const normalized = normalizePlayerName(name);
      const remainingToRemove = removedCountMap.get(normalized) ?? 0;

      if (remainingToRemove > 0) {
        removedCountMap.set(normalized, remainingToRemove - 1);
        continue;
      }

      nextPlayers.push(name);
    }

    return {
      ...team,
      players: nextPlayers,
    };
  });
}

function normalizePlayerName(playerName: string) {
  return playerName.replace(/\s+/g, "").toLowerCase();
}
