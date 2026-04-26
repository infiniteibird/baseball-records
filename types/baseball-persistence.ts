import type { StoredGame, TeamConfig, UploadedPlayer } from "@/data/types";
import type { SavedGameRecord } from "@/types/record";

export type BaseballPersistSource =
  | "mock"
  | "db"
  | "remote-fallback"
  | "cache";

export type BaseballPersistPayload = {
  teams: TeamConfig[];
  games: StoredGame[];
  uploadedPlayers: UploadedPlayer[];
  records: Record<string, SavedGameRecord>;
  source: BaseballPersistSource;
};

export type BaseballApiResponse = {
  ok: boolean;
  payload?: BaseballPersistPayload;
  error?: string;
};
