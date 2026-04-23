import type { RecordCellEntry } from "@/types/record";
import type {
  BatterRecordRow,
  PitcherRecordRow,
  TeamPitcherAssignment,
} from "@/types/record";
import type { PitchingStatRow } from "@/data/types";
import { recordCodeMap } from "@/lib/record-codes";

const EMPTY_PITCHER_ID = "__pitcher_fallback__";

type PitcherSequenceSlot = {
  batterId: string;
  batterName: string;
  inningIndex: number;
  entries: Array<RecordCellEntry>;
  sequenceIndex: number;
};

type RawPitcherAccumulator = {
  hitsAllowed: number;
  runs: number;
  earnedRuns: number;
  walks: number;
  hitByPitch: number;
  strikeouts: number;
  homeRunsAllowed: number;
  batters: number;
  atBats: number;
  outs: number;
};

function formatInningsFromOuts(outs: number) {
  if (outs <= 0) {
    return "0.0";
  }

  return `${Math.floor(outs / 3)}.${outs % 3}`;
}

function estimatePitchCount(outs: number, hitsAllowed: number, strikeouts: number, walks: number) {
  return outs * 4 + hitsAllowed * 2 + strikeouts * 2 + walks;
}

export function createPitchingSequence(batters: BatterRecordRow[]): PitcherSequenceSlot[] {
  const slots: PitcherSequenceSlot[] = [];
  let sequenceIndex = 0;

  batters.forEach((batter) => {
    batter.inningResults.forEach((entries, inningIndex) => {
      if (entries.length === 0) {
        return;
      }

      slots.push({
        batterId: batter.id,
        batterName: batter.playerName,
        inningIndex,
        entries,
        sequenceIndex: sequenceIndex++,
      });
    });
  });

  return slots;
}

export function findPitchingSequenceIndex(
  sequence: PitcherSequenceSlot[],
  batterId: string,
  inningIndex: number,
): number | null {
  const match = sequence.find(
    (slot) => slot.batterId === batterId && slot.inningIndex === inningIndex,
  );
  return match ? match.sequenceIndex : null;
}

function accumulatePitcherTotalsByEntries(entries: RecordCellEntry[]): RawPitcherAccumulator {
  return entries.reduce<RawPitcherAccumulator>(
    (accumulator, entry, entryIndex) => {
      const definition = recordCodeMap.get(entry.code);
      if (!definition) {
        return accumulator;
      }

      switch (definition.category) {
        case "single":
        case "double":
        case "triple":
        case "home_run":
          accumulator.hitsAllowed += 1;
          if (definition.category === "home_run") {
            accumulator.homeRunsAllowed += 1;
          }
          if (entryIndex === 0) {
            accumulator.atBats += 1;
          }
          break;
        case "strikeout":
          accumulator.strikeouts += 1;
          accumulator.atBats += 1;
          accumulator.outs += 1;
          break;
        case "walk":
        case "intentional_walk":
          accumulator.walks += 1;
          break;
        case "hit_by_pitch":
          accumulator.hitByPitch += 1;
          break;
        case "groundout":
        case "out":
          accumulator.atBats += 1;
          accumulator.outs += 1;
          break;
        case "double_play":
          accumulator.atBats += 1;
          accumulator.outs += 2;
          break;
        case "sac_bunt":
        case "sac_fly":
          accumulator.outs += 1;
          break;
        case "error":
        case "fielders_choice":
          accumulator.atBats += 1;
          break;
        case "run_scored":
          accumulator.runs += 1;
          accumulator.earnedRuns += 1;
          break;
        default:
          break;
      }

      return accumulator;
    },
    {
      hitsAllowed: 0,
      runs: 0,
      earnedRuns: 0,
      walks: 0,
      hitByPitch: 0,
      strikeouts: 0,
      homeRunsAllowed: 0,
      batters: 0,
      atBats: 0,
      outs: 0,
    },
  );
}

function appendSequenceTotals(
  totals: RawPitcherAccumulator,
  sequence: PitcherSequenceSlot[],
  startIndex: number,
  endIndex: number,
): RawPitcherAccumulator {
  if (startIndex > endIndex || sequence.length === 0) {
    return totals;
  }

  for (let index = startIndex; index <= endIndex; index += 1) {
    const slot = sequence[index];
    if (!slot) {
      continue;
    }

    totals.batters += 1;
    const slotTotals = accumulatePitcherTotalsByEntries(slot.entries);
    totals.hitsAllowed += slotTotals.hitsAllowed;
    totals.runs += slotTotals.runs;
    totals.earnedRuns += slotTotals.earnedRuns;
    totals.walks += slotTotals.walks;
    totals.hitByPitch += slotTotals.hitByPitch;
    totals.strikeouts += slotTotals.strikeouts;
    totals.homeRunsAllowed += slotTotals.homeRunsAllowed;
    totals.atBats += slotTotals.atBats;
    totals.outs += slotTotals.outs;
  }

  return totals;
}

function resolvePitcherIntervals(
  pitchers: PitcherRecordRow[],
  sequenceLength: number,
  assignments?: TeamPitcherAssignment,
): Array<{ pitcherId: string; startIndex: number; endIndex: number } | null> {
  const result: Array<{ pitcherId: string; startIndex: number; endIndex: number } | null> =
    [];
  const safeAssignments = assignments ?? {};

  const hasExplicitAssignments = Object.keys(safeAssignments).some(
    (pitcherId) => safeAssignments[pitcherId] !== undefined,
  );

  if (!hasExplicitAssignments && sequenceLength > 0) {
    return fallbackAllToStarter(pitchers, sequenceLength);
  }

  let cursor = 0;
  const maxIndex = sequenceLength - 1;

  for (const pitcher of pitchers) {
    if (sequenceLength === 0) {
      result.push(null);
      continue;
    }

    const assignedEnd = safeAssignments[pitcher.id];
    if (assignedEnd == null) {
      result.push(null);
      continue;
    }

    const clampedEnd = Math.min(Math.max(assignedEnd, cursor), maxIndex);
    if (clampedEnd < cursor) {
      result.push(null);
      continue;
    }

    const startIndex = cursor;
    cursor = clampedEnd + 1;
    result.push({ pitcherId: pitcher.id, startIndex, endIndex: clampedEnd });
  }

  return result;
}

function fallbackAllToStarter(
  pitchers: PitcherRecordRow[],
  sequenceLength: number,
): Array<{ pitcherId: string; startIndex: number; endIndex: number } | null> {
  if (pitchers.length === 0) {
    return [];
  }

  const fullInterval = {
    pitcherId: pitchers[0].id,
    startIndex: 0,
    endIndex: Math.max(sequenceLength - 1, 0),
  };
  return pitchers.map((pitcher, index) =>
    index === 0 ? fullInterval : null,
  );
}

export function buildPitchingRowsFromAssignments(
  team: "away" | "home",
  opposingBatters: BatterRecordRow[],
  pitchers: PitcherRecordRow[],
  assignments?: TeamPitcherAssignment,
): PitchingStatRow[] {
  const pitcherLookup = new Map(pitchers.map((pitcher) => [pitcher.id, pitcher]));
  const fallbackPitchers: PitcherRecordRow[] = pitchers.length
    ? pitchers
    : [{ id: EMPTY_PITCHER_ID, name: "투수", role: "선발" }];
  const sequence = createPitchingSequence(opposingBatters);

  const pitcherIntervals = resolvePitcherIntervals(fallbackPitchers, sequence.length, assignments);

  return fallbackPitchers.map((pitcher, pitcherIndex) => {
    const manual = pitcherLookup.get(pitcher.id);
    const interval = pitcherIntervals[pitcherIndex] ?? null;

    const totals = interval
      ? appendSequenceTotals(
          {
            hitsAllowed: 0,
            runs: 0,
            earnedRuns: 0,
            walks: 0,
            hitByPitch: 0,
            strikeouts: 0,
            homeRunsAllowed: 0,
            batters: 0,
            atBats: 0,
            outs: 0,
          },
          sequence,
          interval.startIndex,
          interval.endIndex,
        )
      : {
          hitsAllowed: 0,
          runs: 0,
          earnedRuns: 0,
          walks: 0,
          hitByPitch: 0,
          strikeouts: 0,
          homeRunsAllowed: 0,
          batters: 0,
          atBats: 0,
          outs: 0,
        };

  return {
    team,
    name: pitcher.name,
    ip: formatInningsFromOuts(totals.outs),
    hitsAllowed: totals.hitsAllowed,
    runs: manual?.manualRuns ?? totals.runs,
    earnedRuns: manual?.manualEarnedRuns ?? totals.earnedRuns,
    walks: totals.walks,
    hitByPitch: totals.hitByPitch,
    strikeouts: totals.strikeouts,
    homeRunsAllowed: totals.homeRunsAllowed,
    batters: totals.batters,
    atBats: totals.atBats,
    pitches: manual?.manualPitches ?? estimatePitchCount(
      totals.outs,
      totals.hitsAllowed,
      totals.strikeouts,
      totals.walks + totals.hitByPitch,
    ),
    gameType: pitcher.role,
    win: "",
    loss: "",
    save: "",
  } satisfies PitchingStatRow;
  });
}
