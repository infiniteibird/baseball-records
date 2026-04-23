import * as XLSX from "xlsx";
import type { TeamConfig, UploadedPlayer } from "@/data/types";

type UploadSummary = {
  totalRows: number;
  successCount: number;
  duplicateCount: number;
  failedCount: number;
};

type UploadResult = {
  fileName: string;
  players: UploadedPlayer[];
  summary: UploadSummary;
};

const nameHeaders = ["이름", "선수명", "성명"];
const schoolHeaders = ["출신고", "출신학교", "고등학교"];
export async function parseRosterWorkbook(
  file: File,
  selectedTeam: TeamConfig,
  existingPlayers: UploadedPlayer[],
): Promise<UploadResult> {
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error(".xlsx 파일만 업로드할 수 있습니다.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("엑셀 파일에 시트가 없습니다.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
    header: 1,
    raw: false,
    defval: "",
  });

  if (rows.length < 2) {
    throw new Error("엑셀에 헤더 또는 데이터가 없습니다.");
  }

  const headers = rows[0].map((value) => String(value).trim());
  const nameIndex = findHeaderIndex(headers, nameHeaders);
  const schoolIndex = findHeaderIndex(headers, schoolHeaders);

  if (nameIndex === -1 || schoolIndex === -1) {
    throw new Error("필수 헤더(이름/출신고)를 찾을 수 없습니다.");
  }

  const existingKeys = new Set(existingPlayers.map(createDuplicateKey));
  const seenInFile = new Set<string>();
  const uploadedPlayers: UploadedPlayer[] = [];
  let failedCount = 0;
  let duplicateCount = 0;
  let successCount = 0;

  rows.slice(1).forEach((row, index) => {
    const values = headers.reduce<Record<string, string>>((accumulator, header, headerIndex) => {
      accumulator[header] = String(row[headerIndex] ?? "").trim();
      return accumulator;
    }, {});

    const name = String(row[nameIndex] ?? "").trim();
    const school = String(row[schoolIndex] ?? "").trim();

    if (!name && !school) {
      return;
    }

    if (!name || !school) {
      failedCount += 1;
      return;
    }

    const nextPlayer: UploadedPlayer = {
      id: `upload-player-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      school,
      teamId: selectedTeam.id,
      teamName: selectedTeam.name,
      source: "upload",
      raw: values,
    };

    const duplicateKey = createDuplicateKey(nextPlayer);
    if (existingKeys.has(duplicateKey) || seenInFile.has(duplicateKey)) {
      duplicateCount += 1;
      return;
    }

    seenInFile.add(duplicateKey);
    uploadedPlayers.push(nextPlayer);
    successCount += 1;
  });

  if (successCount === 0 && duplicateCount === 0) {
    throw new Error("업로드 가능한 선수 데이터가 없습니다.");
  }

  return {
    fileName: file.name,
    players: uploadedPlayers,
    summary: {
      totalRows: rows.slice(1).filter((row) => row.some((value) => String(value ?? "").trim() !== "")).length,
      successCount,
      duplicateCount,
      failedCount,
    },
  };
}

export function createDuplicateKey(player: UploadedPlayer) {
  return [
    normalizeValue(player.teamId || player.teamName || "미지정"),
    normalizeValue(player.name),
    normalizeValue(player.school),
  ].join("::");
}

function findHeaderIndex(headers: string[], candidates: string[]) {
  const normalizedHeaders = headers.map(normalizeValue);
  return normalizedHeaders.findIndex((header) =>
    candidates.map(normalizeValue).includes(header),
  );
}

function normalizeValue(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}
