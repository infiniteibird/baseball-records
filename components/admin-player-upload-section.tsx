"use client";

import { useMemo, useRef, useState } from "react";
import { parseRosterWorkbook } from "@/lib/player-roster-import";
import { PlayerRosterList } from "@/components/player-roster-list";
import { useBaseballData } from "@/store/baseball-context";
import type { UploadedPlayer } from "@/data/types";

type UploadSummary = {
  totalRows: number;
  successCount: number;
  duplicateCount: number;
  failedCount: number;
  fileName: string;
};

export function AdminPlayerUploadSection() {
  const {
    state,
    rosterPlayers,
    importUploadedPlayers,
    removeRosterPlayers,
  } = useBaseballData();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null);
  const [previewPlayers, setPreviewPlayers] = useState<UploadedPlayer[]>([]);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");

  const selectedTeam = useMemo(
    () => state.teams.find((team) => team.id === selectedTeamId) ?? null,
    [selectedTeamId, state.teams],
  );

  async function handleFile(file: File) {
    if (!selectedTeam) {
      setMessage({
        type: "error",
        text: "엑셀 업로드 전에 먼저 팀을 선택해 주세요.",
      });
      return;
    }

    try {
      setIsUploading(true);
      const result = await parseRosterWorkbook(file, selectedTeam, state.uploadedPlayers);

      setSelectedFileName(result.fileName);
      setPreviewPlayers(result.players);
      setUploadSummary({
        fileName: result.fileName,
        ...result.summary,
      });
      setMessage({
        type: "success",
        text:
          result.players.length > 0
            ? "엑셀 파일을 읽었습니다. 미리보기를 확인한 뒤 저장을 눌러 반영하세요."
            : "엑셀 파일을 읽었습니다. 새로 추가될 선수는 없고 중복만 확인되었습니다.",
      });
    } catch (error) {
      setPreviewPlayers([]);
      setSelectedFileName("");
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "엑셀 업로드 중 오류가 발생했습니다.",
      });
    } finally {
      setIsUploading(false);
    }
  }

  function handleSave() {
    if (previewPlayers.length === 0 || !selectedTeam) {
      return;
    }

    importUploadedPlayers(previewPlayers);
    setMessage({
      type: "success",
      text: `${selectedTeam.name} 선수 ${previewPlayers.length}명을 저장해 사이트 전체에 반영했습니다.`,
    });
    setPreviewPlayers([]);
    setSelectedFileName("");
    setUploadSummary(null);
    setSelectedTeamId("");
  }

  function resetPreview() {
    setPreviewPlayers([]);
    setSelectedFileName("");
    setUploadSummary(null);
    setMessage(null);
  }

  return (
    <section className="rounded-[28px] border border-line bg-card p-5 shadow-[0_16px_40px_rgba(16,35,63,0.08)] sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          선수 명단 업로드
        </h2>
        <p className="mt-1 text-sm text-muted">
          먼저 팀을 고른 뒤 .xlsx 파일을 업로드하세요. 미리보기 확인 후 저장을
          눌러야만 전체 사이트에 반영됩니다.
        </p>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,240px)_1fr] sm:items-end">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold text-muted">
            업로드 대상 팀
          </span>
          <select
            value={selectedTeamId}
            onChange={(event) => setSelectedTeamId(event.target.value)}
            className="h-11 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground outline-none transition-colors focus:border-primary"
          >
            <option value="">팀 선택</option>
            {state.teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-2xl border border-line bg-soft px-4 py-3 text-sm text-muted">
          {selectedTeam
            ? `${selectedTeam.name} 소속으로 분류됩니다. 엑셀 안의 팀 컬럼 값은 분류 기준으로 사용하지 않습니다.`
            : "팀을 먼저 선택하면 업로드된 모든 선수를 해당 팀 소속으로 미리 분류합니다."}
        </div>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) {
            void handleFile(file);
          }
        }}
        className={
          isDragging
            ? "rounded-3xl border-2 border-dashed border-primary bg-soft p-6 text-center"
            : "rounded-3xl border-2 border-dashed border-line bg-soft p-6 text-center"
        }
      >
        <p className="text-sm font-semibold text-foreground">
          선수 등록용 엑셀(.xlsx) 파일을 끌어 놓거나 선택하세요.
        </p>
        <p className="mt-2 text-xs text-muted">
          첫 번째 시트의 헤더에서 이름과 출신고를 찾아 자동 매핑합니다.
        </p>

        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(19,60,115,0.22)] disabled:opacity-60"
          >
            {isUploading ? "업로드 중..." : "파일 선택"}
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleFile(file);
            }
            event.target.value = "";
          }}
        />
      </div>

      {uploadSummary ? (
        <div className="mt-4 rounded-3xl bg-soft p-4 text-sm text-foreground">
          <p className="font-semibold">
            {selectedFileName || uploadSummary.fileName}
            {selectedTeam ? ` · ${selectedTeam.name}` : ""}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <SummaryStat label="총 행 수" value={uploadSummary.totalRows} />
            <SummaryStat label="성공 등록" value={uploadSummary.successCount} />
            <SummaryStat label="중복 건너뜀" value={uploadSummary.duplicateCount} />
            <SummaryStat label="실패" value={uploadSummary.failedCount} />
          </div>
        </div>
      ) : null}

      {previewPlayers.length > 0 ? (
        <div className="mt-5 rounded-3xl border border-line bg-[#f9fbfe] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                업로드 미리보기
              </h3>
              <p className="mt-1 text-sm text-muted">
                아래 선수는 아직 저장되지 않았습니다. 저장 버튼을 눌러야 전체
                사이트에 반영됩니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={resetPreview}
                className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-primary hover:text-primary"
              >
                미리보기 취소
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(19,60,115,0.18)]"
              >
                저장
              </button>
            </div>
          </div>

          <div className="mt-4">
            <PlayerRosterList
              players={previewPlayers}
              title="업로드 예정 선수"
              subtitle="이름과 출신고만 미리 확인합니다."
            />
          </div>
        </div>
      ) : null}

      {message ? (
        <div
          className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-[#e8f4ec] text-[#17643a]"
              : "bg-[#fff1f1] text-[#a83333]"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="mt-5">
        <PlayerRosterList
          players={rosterPlayers}
          title="현재 선수 명단"
          subtitle="이름과 출신고만 표시합니다. 저장이 끝난 선수만 여기에 반영됩니다."
          onDeletePlayer={(player) =>
            removeRosterPlayers([player])
          }
          pagination={{
            enabled: true,
            itemsPerPage: 15,
            showEdgeButtons: true,
          }}
        />
      </div>
    </section>
  );
}

function SummaryStat({
  label,
  value,
}: Readonly<{
  label: string;
  value: number;
}>) {
  return (
    <div className="rounded-2xl bg-card px-4 py-3">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}
