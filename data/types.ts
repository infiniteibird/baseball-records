import type { SavedGameRecord } from "@/types/record";

export type GameStatus = "예정" | "종료" | "진행중";

export type TeamConfig = {
  id: string;
  name: string;
  players: string[];
};

export type UploadedPlayer = {
  id: string;
  name: string;
  school: string;
  teamId: string;
  teamName: string;
  source: "mock" | "upload";
  raw?: Record<string, string>;
};

export type PlayerRecord = {
  rank: number;
  player: string;
  team: string;
  stat: string;
};

export type HitterStatsRow = {
  player: string;
  team: string;
  avg: string;
  obp: string;
  slg: string;
  ops: string;
  hits: number;
  hr: number;
  rbi: number;
  steals: number;
};

export type PitcherStatsRow = {
  player: string;
  team: string;
  era: string;
  whip: string;
  ip: string;
  so: number;
  wins: number;
  losses: number;
  saves: number;
};

export type GameListItem = {
  id: string;
  date: string;
  time: string;
  stadium: string;
  status: GameStatus;
  awayTeam: string;
  homeTeam: string;
  awayScore: number | null;
  homeScore: number | null;
  note: string;
};

export type LineScore = {
  innings: string[];
  awayRuns: string[];
  homeRuns: string[];
  awayTotals: {
    R: string;
    H: string;
    E: string;
    B: string;
  };
  homeTotals: {
    R: string;
    H: string;
    E: string;
    B: string;
  };
};

export type TeamComparisonStat = {
  label: string;
  away: number;
  home: number;
};

export type GameSummary = {
  decisiveHit: string;
  homeRuns: string;
  doubles: string;
  steals: string;
  caughtStealing: string;
  baserunningOuts: string;
  pickoffs: string;
  passedBalls: string;
  umpires: string;
};

export type BattingStatRow = {
  team: "away" | "home";
  name: string;
  ab: number;
  runs: number;
  hits: number;
  rbi: number;
  hr: number;
  bb: number;
  so: number;
  sb: number;
  avg: string;
  plateAppearancesByInning: string[];
};

export type PitchingStatRow = {
  team: "away" | "home";
  name: string;
  ip: string;
  hitsAllowed: number;
  runs: number;
  earnedRuns: number;
  walks: number;
  strikeouts: number;
  homeRunsAllowed: number;
  batters: number;
  atBats: number;
  pitches: number;
  gameType: string;
  win: string;
  loss: string;
  save: string;
};

export type GameDetail = {
  id: string;
  date: string;
  time: string;
  stadium: string;
  status: GameStatus;
  awayTeam: string;
  homeTeam: string;
  awayScore: number | null;
  homeScore: number | null;
  lineScore: LineScore;
  teamStatsComparison: TeamComparisonStat[];
  summary: GameSummary;
  battingStats: BattingStatRow[];
  pitchingStats: PitchingStatRow[];
  note: string;
};

export type StoredGame = {
  id: string;
  date: string;
  time: string;
  stadium: string;
  status: GameStatus;
  awayTeamId: string;
  homeTeamId: string;
  awayScore: number | null;
  homeScore: number | null;
  note: string;
  source: "mock" | "admin";
  detailAvailable: boolean;
  createdAt: string;
};

export type StoredHitterStat = HitterStatsRow & {
  id: string;
  teamId: string;
};

export type StoredPitcherStat = PitcherStatsRow & {
  id: string;
  teamId: string;
};

export type BaseballState = {
  teams: TeamConfig[];
  games: StoredGame[];
  hitters: StoredHitterStat[];
  pitchers: StoredPitcherStat[];
  records: Record<string, SavedGameRecord>;
  uploadedPlayers: UploadedPlayer[];
};

export type AddGameInput = {
  date: string;
  venue: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  status: "예정" | "종료";
};

export type SaveGameResult = {
  ok: boolean;
  error?: string;
  id?: string;
};

export type StandingsRow = {
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
  offenseHasData: boolean;
  defenseHasData: boolean;
  offenseInnings: string;
  defenseInnings: string;
  scoringRate: number;
  runAllowedRate: number;
  onBaseRate: number;
};

export type DisplayGame = {
  id: string;
  date: string;
  time: string;
  stadium: string;
  status: GameStatus;
  awayTeam: string;
  homeTeam: string;
  awayScore: number | null;
  homeScore: number | null;
  note: string;
  source: "mock" | "admin";
  detailAvailable: boolean;
  createdAt: string;
};

export type TodayGameCard = {
  time: string;
  league: string;
  stadium: string;
  home: string;
  away: string;
  status: GameStatus;
};

export type RecentResultCard = {
  date: string;
  home: string;
  away: string;
  score: string;
  note: string;
};
