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
  manualRuns?: number;
  manualRbi?: number;
};

export type PitcherRecordRow = {
  id: string;
  name: string;
  role: string;
  manualRuns?: number;
  manualEarnedRuns?: number;
  manualPitches?: number;
};

export type TeamRecordDraft = {
  batters: BatterRecordRow[];
  pitchers: PitcherRecordRow[];
  pitcherAssignments?: TeamPitcherAssignment;
};

export type TeamPitcherAssignment = Record<string, number>;

export type ManualLineScore = {
  awayRuns: string[];
  homeRuns: string[];
};

export type SavedGameRecord = {
  gameId: string;
  updatedAt: string;
  saveStatus: RecordSaveStatus;
  away: TeamRecordDraft;
  home: TeamRecordDraft;
  manualLineScore?: ManualLineScore;
};
