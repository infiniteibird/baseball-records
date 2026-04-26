import type { RecordCellEntry } from "@/types/record";

export const PLATE_APPEARANCE_BREAK_CODE = "__PA_BREAK__";

type EntryWithCode = {
  code: string;
};

export function isPlateAppearanceBreak(entry: EntryWithCode) {
  return entry.code === PLATE_APPEARANCE_BREAK_CODE;
}

export function splitPlateAppearances<T extends EntryWithCode>(entries: T[]): T[][] {
  const appearances: T[][] = [];
  let current: T[] = [];

  entries.forEach((entry) => {
    if (isPlateAppearanceBreak(entry)) {
      if (current.length > 0) {
        appearances.push(current);
        current = [];
      }
      return;
    }

    current.push(entry);
  });

  if (current.length > 0) {
    appearances.push(current);
  }

  return appearances;
}

export function flattenPlateAppearances(appearances: RecordCellEntry[][]): RecordCellEntry[] {
  const flattened: RecordCellEntry[] = [];

  appearances.forEach((appearance, index) => {
    if (appearance.length === 0) {
      return;
    }

    if (flattened.length > 0 && index > 0) {
      flattened.push({
        id: `pa-break-${index}`,
        code: PLATE_APPEARANCE_BREAK_CODE,
      });
    }

    appearance.forEach((entry) => {
      if (!isPlateAppearanceBreak(entry)) {
        flattened.push(entry);
      }
    });
  });

  return flattened;
}

export function countPlateAppearances<T extends EntryWithCode>(entries: T[]) {
  return splitPlateAppearances(entries).length;
}

export function formatPlateAppearanceEntries(entries: RecordCellEntry[]) {
  return splitPlateAppearances(entries)
    .map((appearance) => appearance.map((entry) => entry.code).join(" + "))
    .join(" / ");
}

export function parsePlateAppearanceString(value: string, createId: (prefix: string) => string) {
  const normalized = value.trim();
  if (!normalized) {
    return [];
  }

  const appearances = normalized
    .split("/")
    .map((appearance) =>
      appearance
        .split("+")
        .map((code) => code.trim())
        .filter(Boolean)
        .map((code) => ({ id: createId("entry"), code })),
    )
    .filter((appearance) => appearance.length > 0);

  return flattenPlateAppearances(appearances);
}
