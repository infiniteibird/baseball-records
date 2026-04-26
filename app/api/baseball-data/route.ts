import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { buildSeedPayload } from "@/lib/baseball-seed";
import type { BaseballApiResponse } from "@/types/baseball-persistence";
import type { SavedGameRecord } from "@/types/record";

type EnvConfig = {
  url: string;
  key: string;
  urlSource: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_URL" | "none";
  keySource:
    | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    | "SUPABASE_ANON_KEY"
    | "SUPABASE_SERVICE_ROLE_KEY"
    | "none";
  keyKind: "anon" | "service_role" | "none";
  fallback: boolean;
};

type DbTeamRow = {
  id: string;
  name: string;
  players: unknown;
  logo_data?: unknown;
  source?: string;
  created_at?: string;
  updated_at?: string;
};

type DbGameRow = {
  id: string;
  date: string;
  time: string;
  stadium: string;
  status: string;
  away_team_id: string;
  home_team_id: string;
  away_score: number | null;
  home_score: number | null;
  source: string;
  note: string;
  detail_available: boolean;
  record: SavedGameRecord | null;
  season?: number;
  updated_at?: string;
};

type DbPlayerStatRow = {
  id: string;
  team_id: string;
  player_name: string;
  school: string;
  source: string;
  stat_type: string | null;
  raw: Record<string, unknown> | null;
  updated_at?: string;
};

type UpsertTeamRow = {
  id: string;
  name: string;
  players: string[];
  logo_data: string | null;
};

type UpsertGameRow = {
  id: string;
  date: string;
  time: string;
  stadium: string;
  status: string;
  away_team_id: string;
  home_team_id: string;
  away_score: number | null;
  home_score: number | null;
  source: string;
  detail_available: boolean;
  note: string;
  record: SavedGameRecord | null;
  season: number;
};

type UpsertPlayerRow = {
  id: string;
  team_id: string;
  player_name: string;
  school: string;
  source: string;
  stat_type: "roster";
  raw: Record<string, string>;
};

type NormalizedPayload = {
  teams: UpsertTeamRow[];
  games: UpsertGameRow[];
  uploadedPlayers: UpsertPlayerRow[];
  teamIds: string[];
  gameIds: string[];
  playerStatIds: string[];
  records: Record<string, SavedGameRecord>;
};

type PersistScope = "full" | "teams";

type SupabaseRequestOptions = RequestInit & {
  searchParams?: URLSearchParams;
};

type SyncTableName = "teams" | "games" | "player_stats";

type TableOperation = "upsert" | "delete";

function getEnvConfig(): EnvConfig {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  const urlSource = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? "NEXT_PUBLIC_SUPABASE_URL"
    : process.env.SUPABASE_URL
      ? "SUPABASE_URL"
      : "none";

  const keySource = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    : process.env.SUPABASE_ANON_KEY
      ? "SUPABASE_ANON_KEY"
      : process.env.SUPABASE_SERVICE_ROLE_KEY
        ? "SUPABASE_SERVICE_ROLE_KEY"
        : "none";

  const keyKind =
    keySource === "SUPABASE_SERVICE_ROLE_KEY" ? "service_role" : keySource === "none" ? "none" : "anon";

  return {
    url: url ?? "",
    key: key ?? "",
    urlSource,
    keySource,
    keyKind,
    fallback: !Boolean(url && key),
  };
}

type RuntimeEnvironment =
  | "localhost"
  | "render"
  | "vercel"
  | "production"
  | "development"
  | "unknown";

function getRequestHost(request?: NextRequest) {
  if (!request) {
    return "";
  }

  return (
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.host ||
    ""
  );
}

function getRuntimeEnvironment(request?: NextRequest): RuntimeEnvironment {
  if (typeof globalThis !== "undefined" && process.env.RENDER) {
    return "render";
  }

  const host = getRequestHost(request);

  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    return "localhost";
  }

  if (host.includes(".onrender.com") || process.env.RENDER_SERVICE_NAME) {
    return "render";
  }

  if (process.env.VERCEL) {
    return "vercel";
  }

  if (process.env.NODE_ENV === "production") {
    return "production";
  }

  if (process.env.NODE_ENV === "development") {
    return "development";
  }

  return "unknown";
}

function logPostRequestContext(
  runtimeEnv: RuntimeEnvironment,
  host: string,
  normalized: NormalizedPayload,
  payload: unknown,
  requestContentLength: string | null,
  scope: PersistScope,
) {
  const { url, key, urlSource, keySource, keyKind, fallback } = getEnvConfig();

  console.log("[baseball-data][POST] 환경 변수 존재 여부", {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_ANON_KEY: Boolean(process.env.SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
  console.log(`[baseball-data][POST][${runtimeEnv}] 실행 환경`, {
    runtimeEnv,
    nodeEnv: process.env.NODE_ENV,
    host,
    selectedUrl: url || "미설정",
    selectedUrlSource: urlSource,
    selectedKeyType: keyKind,
    selectedKeySource: keySource,
    isFallbackPath: fallback,
    hasKey: Boolean(key),
    hasUrl: Boolean(url),
  });

  console.log("[baseball-data][POST] payload 요약", {
    scope,
    teams: normalized.teams.length,
    games: normalized.games.length,
    uploadedPlayers: normalized.uploadedPlayers.length,
    records: Object.keys(normalized.records).length,
    teamIds: normalized.teamIds.length,
    gameIds: normalized.gameIds.length,
    playerStatIds: normalized.playerStatIds.length,
    requestContentLength,
    payloadBytes:
      typeof payload === "object" && payload !== null
        ? JSON.stringify(payload).length
        : 0,
    teamsWithLogoCount: normalized.teams.filter((team) => Boolean(team.logo_data)).length,
    totalLogoDataLength: normalized.teams.reduce(
      (sum, team) => sum + (team.logo_data?.length ?? 0),
      0,
    ),
    hasPayloadEnvelope:
      typeof payload === "object" && payload !== null && "payload" in payload,
  });
}

function summarizeGameRecord(record: SavedGameRecord | null) {
  if (!record) {
    return null;
  }

  return {
    gameId: record.gameId,
    saveStatus: record.saveStatus,
    updatedAt: record.updatedAt,
    awayBatters: record.away.batters.length,
    homeBatters: record.home.batters.length,
    awayPitchers: record.away.pitchers.length,
    homePitchers: record.home.pitchers.length,
  };
}

function summarizeTeamsPayload(rows: ReturnType<typeof makeSupabasePayload>["teams"]) {
  return rows.slice(0, 3).map((team) => ({
    id: team.id,
    name: team.name,
    playersCount: team.players.length,
    hasLogoData: typeof team.logo_data === "string" && team.logo_data.length > 0,
    logoDataLength: typeof team.logo_data === "string" ? team.logo_data.length : 0,
    logoDataPrefix: typeof team.logo_data === "string" ? team.logo_data.slice(0, 32) : "",
    keys: Object.keys(team).sort(),
  }));
}

function summarizeGamesPayload(rows: ReturnType<typeof makeSupabasePayload>["games"]) {
  return rows.slice(0, 3).map((game) => ({
    id: game.id,
    date: game.date,
    time: game.time,
    status: game.status,
    awayTeamId: game.away_team_id,
    homeTeamId: game.home_team_id,
    awayScore: game.away_score,
    homeScore: game.home_score,
    detailAvailable: game.detail_available,
    source: game.source,
    note: game.note,
    record: summarizeGameRecord(game.record),
  }));
}

function summarizePlayerStatsPayload(
  rows: ReturnType<typeof makeSupabasePayload>["playerStats"],
) {
  return rows.slice(0, 5).map((player) => ({
    id: player.id,
    teamId: player.team_id,
    playerName: player.player_name,
    school: player.school,
    source: player.source,
    statType: player.stat_type,
  }));
}

function logSupabasePayloadSamples(payload: ReturnType<typeof makeSupabasePayload>) {
  console.log("[baseball-data][POST] teams payload sample", {
    count: payload.teams.length,
    sample: summarizeTeamsPayload(payload.teams),
    logoTeamIds: payload.teams
      .filter((team) => typeof team.logo_data === "string" && team.logo_data.length > 0)
      .map((team) => ({
        id: team.id,
        logoDataLength: typeof team.logo_data === "string" ? team.logo_data.length : 0,
      })),
  });
  console.log("[baseball-data][POST] games payload sample", {
    count: payload.games.length,
    sample: summarizeGamesPayload(payload.games),
  });
  console.log("[baseball-data][POST] player_stats payload sample", {
    count: payload.playerStats.length,
    sample: summarizePlayerStatsPayload(payload.playerStats),
  });
}

function logSupabaseQueryError(
  table: SyncTableName,
  operation: TableOperation,
  error: unknown,
) {
  console.error(
    `[baseball-data] ${table} ${operation} 실패`,
    error instanceof Error ? error.message : error,
  );

  if (error && typeof error === "object") {
    console.error("[baseball-data] raw 에러 원문", error);
  }
}

function hasSupabaseEnv(): boolean {
  const { url, key } = getEnvConfig();
  return Boolean(url && key);
}

function createSupabaseHeaders(apiKey: string) {
  return {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

function buildRestUrl(path: string, query?: URLSearchParams) {
  const { url } = getEnvConfig();
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const finalUrl = new URL(`rest/v1/${normalizedPath}`, `${url}/`);

  if (query) {
    query.forEach((value, key) => {
      finalUrl.searchParams.set(key, value);
    });
  }

  return finalUrl.toString();
}

async function supabaseFetch<T>(
  path: string,
  options: SupabaseRequestOptions = {},
): Promise<T> {
  const { searchParams, headers: customHeaders, ...rest } = options;
  const { key } = getEnvConfig();

  const response = await fetch(buildRestUrl(path, searchParams), {
    ...rest,
    headers: {
      ...createSupabaseHeaders(key),
      ...(customHeaders as HeadersInit),
    },
  });

  const rawText = await response.text();
  let parsed: unknown = null;

  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const message =
      typeof parsed === "object" &&
      parsed !== null &&
      "message" in (parsed as { message?: unknown })
        ? String((parsed as { message?: unknown }).message)
        : response.statusText || "Supabase request failed";
    throw new Error(message);
  }

  return parsed as T;
}

function toPostgrestInValues(ids: string[]) {
  return `(${ids.map((id) => JSON.stringify(id)).join(",")})`;
}

function parseTeamPlayers(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((name) => name.length > 0);
}

function getSeasonFromDate(date: string) {
  const match = date.match(/(20\d{2})/);
  return match ? Number(match[1]) : new Date().getFullYear();
}

function parseGameStatus(status: unknown): "예정" | "종료" | "진행중" {
  return status === "예정" || status === "종료" || status === "진행중"
    ? status
    : "예정";
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLogoData(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("data:image/")) {
    return undefined;
  }

  return trimmed;
}

function validateLogoDataLength(value: string | null) {
  if (typeof value !== "string" || value.length === 0) {
    return;
  }

  if (value.length > 240_000) {
    throw new Error("팀 로고 데이터가 너무 큽니다. 더 작은 이미지로 다시 업로드해 주세요.");
  }
}

function buildPayloadFromDb(
  teamRows: DbTeamRow[],
  gameRows: DbGameRow[],
  playerRows: DbPlayerStatRow[],
) {
  const teamMap = new Map<string, string>(
    teamRows.map((team) => [team.id, team.name]),
  );

  const teams = teamRows
    .map((team) => ({
      id: normalizeText(team.id),
      name: normalizeText(team.name),
      players: parseTeamPlayers(team.players),
      logoData: normalizeLogoData(team.logo_data),
      source: "mock" as const,
    }))
    .filter((team) => team.id.length > 0 && team.name.length > 0);

  const records: Record<string, SavedGameRecord> = {};
  const games = gameRows
    .map((game) => {
      if (typeof game.record === "object" && game.record !== null) {
        records[game.id] = game.record;
      }

      return {
        id: normalizeText(game.id),
        date: normalizeText(game.date),
        time: normalizeText(game.time),
        stadium: normalizeText(game.stadium),
        status: parseGameStatus(game.status),
        awayTeamId: normalizeText(game.away_team_id),
        homeTeamId: normalizeText(game.home_team_id),
        awayScore:
          typeof game.away_score === "number" ? game.away_score : null,
        homeScore:
          typeof game.home_score === "number" ? game.home_score : null,
        note: normalizeText(game.note),
        source: game.source === "admin" ? ("admin" as const) : ("mock" as const),
        detailAvailable: game.detail_available === true,
        createdAt: game.updated_at
          ? game.updated_at
          : `${normalizeText(game.date).replaceAll(".", "-")}T${normalizeText(game.time)}`,
      };
    })
    .filter((game) => game.id.length > 0 && game.date.length > 0);

  const uploadedPlayers = playerRows
    .map((player) => ({
      id: normalizeText(player.id),
      name: normalizeText(player.player_name),
      school: normalizeText(player.school),
      teamId: normalizeText(player.team_id),
      teamName: teamMap.get(player.team_id) ?? "미지정",
      source: "upload" as const,
      raw:
        player.raw && typeof player.raw === "object"
          ? Object.fromEntries(
              Object.entries(player.raw)
                .map(([key, value]) => [
                  key,
                  typeof value === "string" ? value : "",
                ])
                .filter((entry): entry is [string, string] =>
                  entry[0].trim().length > 0,
                ),
            )
          : {},
    }))
    .filter((player) => player.id.length > 0 && player.name.length > 0 && player.teamId.length > 0);

  return {
    teams,
    games,
    uploadedPlayers,
    records,
    source: "db" as const,
  };
}

function sanitizeUploadedPlayers(players: unknown): UpsertPlayerRow[] {
  if (!Array.isArray(players)) {
    return [];
  }

  type UploadedPlayerDraft = {
    id: string;
    name: string;
    school: string;
    teamId: string;
    teamName: string;
    source: "upload";
  };

  const ids = new Set<string>();

  return players
    .map((value) => {
      if (!value || typeof value !== "object") {
        return null;
      }

      const candidate = value as {
        id?: unknown;
        name?: unknown;
        school?: unknown;
        teamId?: unknown;
        teamName?: unknown;
        source?: unknown;
        raw?: unknown;
      };

      const rawId = normalizeText(candidate.id);
      const id = rawId.length > 0 ? rawId : cryptoRandomId();
      const name = normalizeText(candidate.name);
      const school = normalizeText(candidate.school);
      const teamId = normalizeText(candidate.teamId);

      if (!name || !school || !teamId || ids.has(id)) {
        return null;
      }

      ids.add(id);
      return {
        id,
        name,
        school,
        teamId,
        teamName: typeof candidate.teamName === "string" ? candidate.teamName : "",
        source: "upload",
      };
    })
      .filter((player): player is UploadedPlayerDraft => player !== null)
      .map((player) => ({
        id: player.id,
        team_id: player.teamId,
        player_name: player.name,
        school: player.school,
        source: player.source,
        stat_type: "roster" as const,
        raw:
          playerRaw(player.name, player.school, player.teamName) as Record<
            string,
            string
        >,
    }));
}

function playerRaw(name: string, school: string, teamName: string) {
  return {
    name,
    school,
    teamName,
  } satisfies Record<string, string>;
}

function normalizeRequestPayload(payload: unknown): NormalizedPayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as {
    teams?: unknown;
    games?: unknown;
    uploadedPlayers?: unknown;
    records?: unknown;
  };

  const rawTeams = Array.isArray(candidate.teams) ? candidate.teams : [];
  const rawGames = Array.isArray(candidate.games) ? candidate.games : [];
  const rawPlayers = Array.isArray(candidate.uploadedPlayers)
    ? candidate.uploadedPlayers
    : [];
  const rawRecords =
    candidate.records && typeof candidate.records === "object"
      ? (candidate.records as Record<string, unknown>)
      : {};

  const teamIds = new Set<string>();
  const gameIds = new Set<string>();

  type NormalizedGame = {
    id: string;
    date: string;
    time: string;
    stadium: string;
    status: "예정" | "종료" | "진행중";
    away_team_id: string;
    home_team_id: string;
    away_score: number | null;
    home_score: number | null;
    source: "admin" | "mock";
    detail_available: boolean;
    note: string;
    record: SavedGameRecord | null;
    season: number;
  };

  const teams = rawTeams
    .map<UpsertTeamRow | null>((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidateTeam = item as {
        id?: unknown;
        name?: unknown;
        players?: unknown;
        logoData?: unknown;
      };

      const id = normalizeText(candidateTeam.id);
      const name = normalizeText(candidateTeam.name);

      if (!id || !name) {
        return null;
      }

      teamIds.add(id);
      const normalizedLogoData = normalizeLogoData(candidateTeam.logoData) ?? null;
      return {
        id,
        name,
        players: parseTeamPlayers(candidateTeam.players),
        logo_data: normalizedLogoData,
      };
    })
    .filter((team): team is UpsertTeamRow => team !== null);

  const games = rawGames
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidateGame = item as {
        id?: unknown;
        date?: unknown;
        time?: unknown;
        stadium?: unknown;
        status?: unknown;
        awayTeamId?: unknown;
        homeTeamId?: unknown;
        awayScore?: unknown;
        homeScore?: unknown;
        note?: unknown;
        source?: unknown;
        detailAvailable?: unknown;
        createdAt?: unknown;
        record?: unknown;
      };

      const id = normalizeText(candidateGame.id);
      const date = normalizeText(candidateGame.date);
      const time = normalizeText(candidateGame.time);
      const stadium = normalizeText(candidateGame.stadium);
      const awayTeamId = normalizeText(candidateGame.awayTeamId);
      const homeTeamId = normalizeText(candidateGame.homeTeamId);
      const note = normalizeText(candidateGame.note);
      const status = parseGameStatus(candidateGame.status);

      if (!id || !date || !time || !stadium || !awayTeamId || !homeTeamId) {
        return null;
      }

      gameIds.add(id);
      return {
        id,
        date,
        time,
        stadium,
        status,
        away_team_id: awayTeamId,
        home_team_id: homeTeamId,
        away_score:
          typeof candidateGame.awayScore === "number"
            ? candidateGame.awayScore
            : null,
        home_score:
          typeof candidateGame.homeScore === "number"
            ? candidateGame.homeScore
            : null,
        source:
          candidateGame.source === "admin" || candidateGame.source === "mock"
            ? candidateGame.source
            : "admin",
        detail_available:
          typeof candidateGame.detailAvailable === "boolean"
            ? candidateGame.detailAvailable
            : true,
        note,
        record:
          candidateGame.record && typeof candidateGame.record === "object"
            ? (candidateGame.record as SavedGameRecord)
            : null,
        season: getSeasonFromDate(date),
      } satisfies NormalizedGame;
    })
    .filter((game): game is NormalizedGame => game !== null)
    .map((game) => ({
      id: game.id,
      date: game.date,
      time: game.time,
      stadium: game.stadium,
      status: game.status,
      away_team_id: game.away_team_id,
      home_team_id: game.home_team_id,
      away_score: game.away_score,
      home_score: game.home_score,
      source: game.source,
      detail_available: game.detail_available,
      note: game.note,
      record: game.record,
      season: game.season,
    }));

  const uploadedPlayers = sanitizeUploadedPlayers(rawPlayers);

  const records: Record<string, SavedGameRecord> = {};
  Object.entries(rawRecords).forEach(([gameId, row]) => {
    if (!isPlainObject(row)) {
      return;
    }

    const rawRecord = row as {
      gameId?: unknown;
      updatedAt?: unknown;
      saveStatus?: unknown;
      manualLineScore?: unknown;
      officials?: unknown;
      away?: unknown;
      home?: unknown;
    };

    if (
      typeof rawRecord.away !== "object" ||
      rawRecord.away === null ||
      typeof rawRecord.home !== "object" ||
      rawRecord.home === null ||
      typeof rawRecord.updatedAt !== "string"
    ) {
      return;
    }

    records[normalizeText(gameId)] = {
      gameId: normalizeText(gameId),
      updatedAt: rawRecord.updatedAt,
      saveStatus: rawRecord.saveStatus === "draft" ? "draft" : "saved",
      away: rawRecord.away as SavedGameRecord["away"],
      home: rawRecord.home as SavedGameRecord["home"],
      manualLineScore:
        typeof rawRecord.manualLineScore === "object" && rawRecord.manualLineScore !== null
          ? (rawRecord.manualLineScore as SavedGameRecord["manualLineScore"])
          : undefined,
      officials:
        typeof rawRecord.officials === "object" && rawRecord.officials !== null
          ? (rawRecord.officials as SavedGameRecord["officials"])
          : undefined,
    };
  });

  return {
    teams,
    games,
    uploadedPlayers,
    records,
    teamIds: Array.from(teamIds),
    gameIds: Array.from(gameIds),
    playerStatIds: uploadedPlayers.map((player) => player.id),
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cryptoRandomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `id-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function readFromDatabase() {
  return Promise.all([
    supabaseFetch<DbTeamRow[]>(
      "teams?select=id,name,players,logo_data,updated_at",
    ),
    supabaseFetch<DbGameRow[]>(
      "games?select=id,date,time,stadium,status,away_team_id,home_team_id,away_score,home_score,source,note,detail_available,record,updated_at",
    ),
    supabaseFetch<DbPlayerStatRow[]>(
      "player_stats?select=id,team_id,player_name,school,source,stat_type,raw,updated_at",
    ),
  ]).then(([teams, games, players]) => ({ teams, games, players }));
}

function logApiContext(
  method: "GET" | "POST",
  runtimeEnv: RuntimeEnvironment,
  host: string,
) {
  const envConfig = getEnvConfig();
  const hostSummary = `runtime=${runtimeEnv}, node=${process.env.NODE_ENV ?? "unknown"}, host=${host || "unknown"}`;

  console.log(`[baseball-data][${method}][${runtimeEnv}] 시작`, {
    runtimeEnv: hostSummary,
    nextPublicUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseUrl: Boolean(process.env.SUPABASE_URL),
    nextPublicAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseAnonKey: Boolean(process.env.SUPABASE_ANON_KEY),
    serviceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    selectedUrl: envConfig.url || "미설정",
    selectedUrlSource: envConfig.urlSource,
    selectedKeyType: envConfig.keyKind,
    selectedKeySource: envConfig.keySource,
    fallback: !hasSupabaseEnv(),
  });
}

function summarizePostResult(runtimeEnv: RuntimeEnvironment) {
  const { url, keyKind, keySource, fallback } = getEnvConfig();
  console.log(`[baseball-data][POST][${runtimeEnv}] supabase write success`, {
    selectedUrl: url || "미설정",
    selectedKeyType: keyKind,
    selectedKeySource: keySource,
    fallback,
  });
}

function makeSupabasePayload(normalized: ReturnType<typeof normalizeRequestPayload>) {
  if (!normalized) {
    throw new Error("normalized payload가 유효하지 않습니다.");
  }

  const games = normalized.games.map((game) => ({
    id: game.id,
    date: game.date,
    time: game.time,
    stadium: game.stadium,
    status: game.status,
    away_team_id: game.away_team_id,
    home_team_id: game.home_team_id,
    away_score: game.away_score,
    home_score: game.home_score,
    source: game.source,
    detail_available: game.detail_available,
    note: game.note,
    record:
      normalized.records[game.id] ??
      game.record ??
      null,
    season: game.season,
  }));

  const teams = normalized.teams.map((team) => {
    const normalizedLogoData = normalizeLogoData(team.logo_data) ?? null;
    validateLogoDataLength(normalizedLogoData);

    return {
      id: team.id,
      name: team.name,
      players: [...new Set(team.players)],
      logo_data: normalizedLogoData,
    };
  });

  const playerStats = normalized.uploadedPlayers.map((player) => ({
    id: player.id,
    team_id: player.team_id,
    player_name: player.player_name,
    school: player.school,
    source: player.source,
    stat_type: player.stat_type,
    raw: player.raw,
  }));

  return { teams, games, playerStats };
}

async function upsertAndPruneRows(
  table: string,
  rows: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  if (rows.length === 0) {
    console.info(`[baseball-data] ${table} upsert 스킵 (데이터 없음)`);
    return [];
  }

  const payload = JSON.stringify(rows);
  try {
    console.log(`[baseball-data] ${table} upsert 시작`, {
      count: rows.length,
      sample: rows.slice(0, 2),
      payloadBytes: payload.length,
      perRowBytes: rows.slice(0, 5).map((row) => JSON.stringify(row).length),
    });
    const result = await supabaseFetch<Record<string, unknown>[]>(
      `${table}?on_conflict=id`,
      {
        method: "POST",
        headers: {
          Prefer: "resolution=merge-duplicates",
        },
        body: payload,
      },
    );
    console.log(`[baseball-data] ${table} upsert 응답 sample`, {
      count: Array.isArray(result) ? result.length : 0,
      sample: Array.isArray(result) ? result.slice(0, 2) : [],
    });
    console.log(`[baseball-data] ${table} upsert 성공`, {
      count: rows.length,
    });
    return Array.isArray(result) ? result : [];
  } catch (error) {
    logSupabaseQueryError(
      table as SyncTableName,
      "upsert",
      {
        message: error instanceof Error ? error.message : "upsert 실패",
        raw: error,
        payloadCount: rows.length,
      },
    );
    throw error;
  }
}

function verifyTeamLogoPersistence(
  requestRows: ReturnType<typeof makeSupabasePayload>["teams"],
  persistedRows: Array<{ id: string; name: string; logo_data: string | null }>,
) {
  const teamsWithLogo = requestRows.filter((team) => Boolean(team.logo_data));
  if (teamsWithLogo.length === 0) {
    console.log("[baseball-data] teams logo_data 검증 스킵 (로고 없음)");
    return;
  }

  console.log("[baseball-data] teams logo_data 조회 검증", {
    requested: requestRows
      .filter((team) => Boolean(team.logo_data))
      .map((team) => ({
        id: team.id,
        requestLogoLength: team.logo_data?.length ?? 0,
      })),
    persisted: persistedRows.map((team) => ({
      id: team.id,
      name: team.name,
      persistedLogoLength: typeof team.logo_data === "string" ? team.logo_data.length : 0,
      hasLogoData: typeof team.logo_data === "string" && team.logo_data.length > 0,
      logoDataPrefix: typeof team.logo_data === "string" ? team.logo_data.slice(0, 32) : "",
    })),
  });

  const missingTeam = requestRows
    .filter((team) => Boolean(team.logo_data))
    .find((team) => {
      const persisted = persistedRows.find((row) => row.id === team.id);
      return !(persisted && typeof persisted.logo_data === "string" && persisted.logo_data.length > 0);
    });

  if (missingTeam) {
    throw new Error(
      `${missingTeam.name} 팀 로고가 teams.logo_data에 저장되지 않았습니다.`,
    );
  }
}

async function fetchTeamsForLogoVerification(teamIds: string[]) {
  if (teamIds.length === 0) {
    return [];
  }

  const query = new URLSearchParams({
    select: "id,name,logo_data",
    id: `in.${toPostgrestInValues(teamIds)}`,
  });

  const rows = await supabaseFetch<
    Array<{ id: string; name: string; logo_data: string | null }>
  >("teams", {
    method: "GET",
    searchParams: query,
  });

  console.log("[baseball-data] teams logo_data 재조회 sample", {
    count: rows.length,
    sample: rows.slice(0, 5).map((team) => ({
      id: team.id,
      name: team.name,
      hasLogoData: typeof team.logo_data === "string" && team.logo_data.length > 0,
      logoDataLength: typeof team.logo_data === "string" ? team.logo_data.length : 0,
      logoDataPrefix: typeof team.logo_data === "string" ? team.logo_data.slice(0, 32) : "",
    })),
  });

  return rows;
}

async function deleteMissingRows(
  table: string,
  key: string,
  keepIds: string[],
  options: { skipOnEmpty?: boolean } = {},
) {
  const { skipOnEmpty = true } = options;

  if (keepIds.length === 0) {
    if (skipOnEmpty) {
      console.log(
        `[baseball-data] ${table} prune 스킵 (keepIds 비어 있어 삭제 생략)`,
      );
      return;
    }

    try {
      const query = new URLSearchParams({
        [key]: `eq.__baseball-data-empty`,
      });
      await supabaseFetch(`${table}`, {
        method: "DELETE",
        searchParams: query,
      });
      console.log(`[baseball-data] ${table} prune 성공 (empty 보호 조건 적용)`);
    } catch (error) {
      logSupabaseQueryError(
        table as SyncTableName,
        "delete",
        {
          message: error instanceof Error ? error.message : "delete all 실패",
          raw: error,
          mode: "delete-all",
        },
      );
      throw error;
    }

    return;
  }

  const query = new URLSearchParams({
    [key]: `not.in.${toPostgrestInValues(keepIds)}`,
  });

  try {
    console.log(`[baseball-data] ${table} prune 시작`, {
      key,
      keepIdsCount: keepIds.length,
      keepIdsSample: keepIds.slice(0, 5),
    });
    await supabaseFetch(`${table}`, {
      method: "DELETE",
      searchParams: query,
    });
    console.log(`[baseball-data] ${table} prune 성공`, {
      table,
      keepIdsCount: keepIds.length,
    });
  } catch (error) {
    logSupabaseQueryError(
      table as SyncTableName,
      "delete",
      {
        message: error instanceof Error ? error.message : "delete prune 실패",
        raw: error,
        mode: "delete-prune",
      },
    );
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const runtimeEnv = getRuntimeEnvironment(request);
  logApiContext("GET", runtimeEnv, getRequestHost(request));

  if (!hasSupabaseEnv()) {
    console.warn("[baseball-data][GET] Supabase 환경 변수 미설정 (시드 응답)");
    const seed = buildSeedPayload("remote-fallback");
    return NextResponse.json<BaseballApiResponse>(
      { ok: true, payload: seed },
      { status: 200 },
    );
  }

  try {
    const { teams, games, players } = await readFromDatabase();

    if (teams.length === 0 && games.length === 0 && players.length === 0) {
      const seed = buildSeedPayload("remote-fallback");
      return NextResponse.json<BaseballApiResponse>(
        { ok: true, payload: seed },
        { status: 200 },
      );
    }

    const payload = buildPayloadFromDb(teams, games, players);
    return NextResponse.json<BaseballApiResponse>({ ok: true, payload });
  } catch (error) {
    console.error("[baseball-data][GET] DB 조회 실패", error);
    return NextResponse.json<BaseballApiResponse>(
      {
        ok: false,
        error:
          error instanceof Error
            ? `DB 조회 실패 (${error.message})`
            : "DB 조회 실패",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const runtimeEnv = getRuntimeEnvironment(request);
  const host = getRequestHost(request);
  logApiContext("POST", runtimeEnv, host);
  if (!hasSupabaseEnv()) {
    console.log(`[baseball-data][POST][${runtimeEnv}] fallback to seed mode`, {
      selectedUrl: getEnvConfig().url || "미설정",
      selectedUrlSource: getEnvConfig().urlSource,
      selectedKeySource: getEnvConfig().keySource,
      selectedKeyType: getEnvConfig().keyKind,
    });
    console.warn(
      "[baseball-data][POST] Supabase 환경 변수 미설정 (임시 저장 모드)",
    );
    return NextResponse.json<BaseballApiResponse>(
      {
        ok: false,
        error: "Supabase 환경 변수 미설정으로 서버 저장은 비활성화되었습니다.",
      },
      { status: 503 },
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const scope: PersistScope = body?.scope === "teams" ? "teams" : "full";
    const normalized = normalizeRequestPayload(body?.payload);

    if (!normalized) {
      return NextResponse.json<BaseballApiResponse>(
        { ok: false, error: "payload 형식이 올바르지 않습니다." },
        { status: 400 },
      );
    }

    logPostRequestContext(
      runtimeEnv,
      host,
      normalized,
      body,
      request.headers.get("content-length"),
      scope,
    );
    const sanitized = makeSupabasePayload(normalized);
    logSupabasePayloadSamples(sanitized);

    try {
      const persistedTeamsFromUpsert = await upsertAndPruneRows("teams", sanitized.teams);
      if (persistedTeamsFromUpsert.length === 0) {
        console.log("[baseball-data] teams upsert 응답 본문 비어 있음 - DB 재조회로 logo_data 검증 진행");
      }
      const persistedTeams = await fetchTeamsForLogoVerification(
        sanitized.teams
          .filter((team) => typeof team.logo_data === "string" && team.logo_data.length > 0)
          .map((team) => team.id),
      );
      verifyTeamLogoPersistence(sanitized.teams, persistedTeams);
    } catch (error) {
      console.error("[baseball-data] teams upsert/DB 요청 실패");
      throw new Error(
        `teams 업서트 실패: ${
          error instanceof Error ? error.message : "알 수 없는 오류"
        }`,
      );
    }

    try {
      await upsertAndPruneRows("player_stats", sanitized.playerStats);
    } catch (error) {
      console.error("[baseball-data] player_stats upsert/DB 요청 실패");
      throw new Error(
        `player_stats 업서트 실패: ${
          error instanceof Error ? error.message : "알 수 없는 오류"
        }`,
      );
    }

    try {
      await deleteMissingRows("player_stats", "id", normalized.playerStatIds);
    } catch (error) {
      console.error("[baseball-data] player_stats prune/DB 요청 실패");
      throw new Error(
        `player_stats 삭제(Prune) 실패: ${
          error instanceof Error ? error.message : "알 수 없는 오류"
        }`,
      );
    }

    try {
      await deleteMissingRows("teams", "id", normalized.teamIds);
    } catch (error) {
      console.error("[baseball-data] teams prune/DB 요청 실패");
      throw new Error(
        `teams 삭제(Prune) 실패: ${
          error instanceof Error ? error.message : "알 수 없는 오류"
        }`,
      );
    }

    if (scope === "full") {
      try {
        await upsertAndPruneRows("games", sanitized.games);
      } catch (error) {
        console.error("[baseball-data] games upsert/DB 요청 실패");
        throw new Error(
          `games 업서트 실패: ${
            error instanceof Error ? error.message : "알 수 없는 오류"
          }`,
        );
      }

      try {
        await deleteMissingRows("games", "id", normalized.gameIds);
      } catch (error) {
        console.error("[baseball-data] games prune/DB 요청 실패");
        throw new Error(
          `games 삭제(Prune) 실패: ${
            error instanceof Error ? error.message : "알 수 없는 오류"
          }`,
        );
      }
    } else {
      console.log("[baseball-data][POST] teams scope 저장: games upsert/prune 생략");
    }

    summarizePostResult(runtimeEnv);
    return NextResponse.json<BaseballApiResponse>({ ok: true });
  } catch (error) {
    console.error("[baseball-data] POST 요청 전체 실패", error);
    return NextResponse.json<BaseballApiResponse>(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "DB 저장 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
