export type PositionCode = "P" | "C" | "1B" | "2B" | "3B" | "SS" | "LF" | "CF" | "RF" | "DH";

export type PositionOption = {
  value: PositionCode;
  label: string;
};

export const POSITION_OPTIONS: PositionOption[] = [
  { value: "P", label: "투수" },
  { value: "C", label: "포수" },
  { value: "1B", label: "1루수" },
  { value: "2B", label: "2루수" },
  { value: "3B", label: "3루수" },
  { value: "SS", label: "유격수" },
  { value: "LF", label: "좌익수" },
  { value: "CF", label: "중견수" },
  { value: "RF", label: "우익수" },
  { value: "DH", label: "지명타자" },
] as const;

const legacyPositionAlias: Record<string, PositionCode> = {
  지: "P",
  투: "P",
  포: "C",
  "1": "1B",
  "2": "2B",
  "3": "3B",
  유: "SS",
  좌: "LF",
  중: "CF",
  우: "RF",
  DH: "DH",
  타: "CF",
};

const positionLabelMap = new Map(POSITION_OPTIONS.map((item) => [item.value, item.label]));

export function toPositionCode(value: string): PositionCode {
  return legacyPositionAlias[value] ?? (POSITION_OPTIONS.some((option) => option.value === value) ? (value as PositionCode) : "CF");
}

export function getPositionLabel(value: string): string {
  const code = toPositionCode(value);
  return positionLabelMap.get(code) ?? value;
}
