import type { StoredGame, TeamConfig, UploadedPlayer } from "@/data/types";
import type { SavedGameRecord } from "@/types/record";

export type BaseballPersistPayload = {
  teams: TeamConfig[];
  games: StoredGame[];
  uploadedPlayers: UploadedPlayer[];
  records: Record<string, SavedGameRecord>;
  source: "mock" | "db" | "remote-fallback";
};

export type BaseballApiResponse = {
  ok: boolean;
  payload?: BaseballPersistPayload;
  error?: string;
};
