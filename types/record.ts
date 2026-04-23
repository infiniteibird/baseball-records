export type RecordSaveStatus = "draft" | "saved";

export type RecordCellEntry = {
  id: string;
  code: string;
};

export type BatterRecordRow = {
  id: string;
  battingOrder: number;
  playerName: string;
  position: string;
  inningResults: RecordCellEntry[][];
};

export type PitcherRecordRow = {
  id: string;
  name: string;
  role: string;
};

export type TeamRecordDraft = {
  batters: BatterRecordRow[];
  pitchers: PitcherRecordRow[];
  pitcherAssignments?: TeamPitcherAssignment;
};

export type TeamPitcherAssignment = Record<string, number>;

export type SavedGameRecord = {
  gameId: string;
  updatedAt: string;
  saveStatus: RecordSaveStatus;
  away: TeamRecordDraft;
  home: TeamRecordDraft;
};
