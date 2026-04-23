"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { useMemo, useState } from "react";
import { SectionCard } from "@/components/section-card";
import {
  buildGameDetailFromRecord,
  createInitialRecordForGame,
} from "@/lib/record-calculators";
import { POSITION_OPTIONS, toPositionCode } from "@/lib/position-options";
import {
  recordCodeCategoryLabel,
  searchRecordCodes,
  type RecordCodeDefinition,
} from "@/lib/record-codes";
import {
  createPitchingSequence,
  findPitchingSequenceIndex,
} from "@/lib/pitching-calculator";
import { useBaseballData } from "@/store/baseball-context";
import type {
  BatterRecordRow,
  PitcherRecordRow,
  SavedGameRecord,
} from "@/types/record";
import type { TeamConfig } from "@/data/types";

type ActiveCellState = {
  team: "away" | "home";
  rowId: string;
  inningIndex: number;
  mode: "replace" | "append";
};

type PitcherAssignmentMode = {
  team: "away" | "home";
  pitcherId: string;
} | null;

type PitcherAssignmentsTarget = "away" | "home" | null;

export function RecordPageClient({ gameId }: Readonly<{ gameId: string }>) {
  const { state, isHydrated, saveGameRecord } = useBaseballData();
  const [draftRecord, setDraftRecord] = useState<SavedGameRecord | null>(null);
  const [activeCell, setActiveCell] = useState<ActiveCellState | null>(null);
  const [pitcherAssignmentMode, setPitcherAssignmentMode] =
    useState<PitcherAssignmentMode>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const game = state.games.find((item) => item.id === gameId);
  const sourceRecord = useMemo(
    () =>
      game ? state.records[gameId] ?? createInitialRecordForGame(game, state.teams) : null,
    [game, gameId, state.records, state.teams],
  );
  const awayTeamPlayers = useMemo(
    () => getTeamPlayerNames(state.teams, game?.awayTeamId),
    [state.teams, game?.awayTeamId],
  );
  const homeTeamPlayers = useMemo(
    () => getTeamPlayerNames(state.teams, game?.homeTeamId),
    [state.teams, game?.homeTeamId],
  );

  if (!isHydrated) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <SectionCard title="기록 입력" subtitle="기록 데이터를 불러오는 중입니다.">
          <div className="rounded-3xl bg-soft p-6 text-sm text-muted">
            저장된 기록과 경기 정보를 확인하고 있습니다.
          </div>
        </SectionCard>
      </main>
    );
  }

  if (!game) {
    notFound();
  }

  if (!sourceRecord) {
    notFound();
  }

  const stableSourceRecord = sourceRecord;
  const editableRecord = draftRecord ?? stableSourceRecord;
  const detailPreview = buildGameDetailFromRecord(game, state.teams, editableRecord);
  const awayBatting = detailPreview.battingStats.filter((row) => row.team === "away");
  const homeBatting = detailPreview.battingStats.filter((row) => row.team === "home");
  const awayPitching = detailPreview.pitchingStats.filter((row) => row.team === "away");
  const homePitching = detailPreview.pitchingStats.filter((row) => row.team === "home");
  const pitchingAssignmentTarget: PitcherAssignmentsTarget = pitcherAssignmentMode
    ? pitcherAssignmentMode.team === "away"
      ? "home"
      : "away"
    : null;

  function updateDraft(updater: (record: SavedGameRecord) => SavedGameRecord) {
    setDraftRecord((current) => {
      const baseRecord = cloneRecord(current ?? stableSourceRecord);
      return updater(baseRecord);
    });
  }

  function updateBatters(
    team: "away" | "home",
    updater: (rows: BatterRecordRow[]) => BatterRecordRow[],
  ) {
    updateDraft((current) => ({
      ...current,
      [team]: {
        ...current[team],
        batters: updater(current[team].batters),
      },
    }));
  }

  function updatePitchers(
    team: "away" | "home",
    updater: (rows: PitcherRecordRow[]) => PitcherRecordRow[],
  ) {
    updateDraft((current) => ({
      ...current,
      [team]: {
        ...current[team],
        pitcherAssignments: { ...(current[team].pitcherAssignments ?? {}) },
        pitchers: updater(current[team].pitchers),
      },
    }));
  }

  function setPitcherAssignment(team: "away" | "home", pitcherId: string, batterCell: Pick<ActiveCellState, "rowId" | "inningIndex"> | null) {
    if (!batterCell) {
      return;
    }

    const opponentTeam = team === "away" ? "home" : "away";
    const sequence = createPitchingSequence(editableRecord[opponentTeam].batters);
    const selectedIndex = findPitchingSequenceIndex(
      sequence,
      batterCell.rowId,
      batterCell.inningIndex,
    );

    if (selectedIndex === null) {
      setMessage({
        type: "error",
        text: "타석 기록이 없는 셀은 투수 구간의 마지막 타자로 지정할 수 없습니다.",
      });
      return;
    }

    updateDraft((current) => ({
      ...current,
      [team]: {
        ...current[team],
        pitcherAssignments: {
          ...(current[team].pitcherAssignments ?? {}),
          [pitcherId]: selectedIndex,
        },
      },
    }));
    setMessage({
      type: "success",
      text: "투수 구간이 반영되었습니다. 계속해서 다음 타자 셀을 선택해 구간 끝을 조정하거나 버튼을 다시 눌러 선택을 해제하세요.",
    });
  }

  function handleAssignBatterCell(
    battingTeam: "away" | "home",
    rowId: string,
    inningIndex: number,
  ) {
    if (!pitcherAssignmentMode) {
      return;
    }

    const targetTeam = getTargetPitchingTeam(pitcherAssignmentMode.team);
    if (!targetTeam || targetTeam !== battingTeam) {
      setMessage({
        type: "error",
        text: "선택한 투수의 상대 타자 테이블에서만 마지막 타자를 지정할 수 있습니다.",
      });
      return;
    }

    setPitcherAssignment(pitcherAssignmentMode.team, pitcherAssignmentMode.pitcherId, {
      rowId,
      inningIndex,
    });
  }

  function removePitcherRow(team: "away" | "home", rowId: string) {
    updateDraft((current) => {
      const rows = current[team].pitchers;
      const nextRows = rows.filter((row) => row.id !== rowId);
      const nextAssignments = { ...(current[team].pitcherAssignments ?? {}) };

      delete nextAssignments[rowId];
      if (nextRows.length === 0) {
        return {
          ...current,
          [team]: {
            ...current[team],
            pitchers: [],
            pitcherAssignments: {},
          },
        };
      }

      return {
        ...current,
        [team]: {
          ...current[team],
          pitchers: nextRows,
          pitcherAssignments: nextAssignments,
        },
      };
    });

    if (pitcherAssignmentMode?.team === team && pitcherAssignmentMode.pitcherId === rowId) {
      setPitcherAssignmentMode(null);
    }
  }

  function handleSelectPitcherForAssignment(team: "away" | "home", pitcherId: string) {
    const teamPitchers = team === "away" ? editableRecord.away.pitchers : editableRecord.home.pitchers;
    if (!teamPitchers.some((pitcher) => pitcher.id === pitcherId)) {
      return;
    }

    setPitcherAssignmentMode((current) => {
      if (current?.team === team && current?.pitcherId === pitcherId) {
        setMessage({
          type: "success",
          text: "투수 구간 지정 모드를 해제했습니다.",
        });
        return null;
      }

      const pitcherName = findPitcherName(teamPitchers, pitcherId);
      setMessage({
        type: "success",
        text: `${pitcherName} 투수 구간 지정 모드가 활성화되었습니다.`,
      });
      return {
        team,
        pitcherId,
      };
    });
  }

  function clearPitcherAssignment(team: "away" | "home", pitcherId: string) {
    updateDraft((current) => {
      const assignments = { ...(current[team].pitcherAssignments ?? {}) };
      delete assignments[pitcherId];
      return {
        ...current,
        [team]: {
          ...current[team],
          pitcherAssignments: assignments,
        },
      };
    });
  }

  function applyCodeToCell(code: string) {
    if (!activeCell) {
      return;
    }

    updateBatters(activeCell.team, (rows) =>
      rows.map((row) => {
        if (row.id !== activeCell.rowId) {
          return row;
        }

        return {
          ...row,
          inningResults: row.inningResults.map((entries, index) => {
            if (index !== activeCell.inningIndex) {
              return entries;
            }

            const nextEntry = { id: createId("entry"), code };
            return activeCell.mode === "append" ? [...entries, nextEntry] : [nextEntry];
          }),
        };
      }),
    );

    setActiveCell(null);
  }

  function clearCell(team: "away" | "home", rowId: string, inningIndex: number) {
    updateBatters(team, (rows) =>
      rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              inningResults: row.inningResults.map((entries, index) =>
                index === inningIndex ? [] : entries,
              ),
            }
          : row,
      ),
    );
  }

  function handleSave(saveStatus: "draft" | "saved") {
    saveGameRecord(gameId, editableRecord, saveStatus);
    setDraftRecord(null);
    setPitcherAssignmentMode(null);
    setActiveCell(null);
    setMessage({
      type: "success",
      text:
        saveStatus === "saved"
          ? "경기 기록을 저장하고 사이트 전체에 반영했습니다."
          : "경기 기록을 임시저장하고 상세 화면에 반영했습니다.",
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#113768_0%,#1e4f93_55%,#5a92e4_100%)] p-5 text-white shadow-[0_20px_50px_rgba(19,60,115,0.24)] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-white/75">관리자 경기 기록 입력</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              실제 기록지처럼 입력하고
              <br className="hidden sm:block" />임시저장 또는 저장으로 반영합니다.
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/80 sm:text-base">
              저장 전까지는 이 화면의 초안만 바뀌고, 버튼을 눌렀을 때만 사이트
              전체에 반영됩니다.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-[28px] bg-white/10 p-3 backdrop-blur sm:min-w-[320px]">
            <div className="rounded-2xl bg-white/12 p-4">
              <p className="text-xs text-white/70">원정팀</p>
              <strong className="mt-2 block text-lg">{detailPreview.awayTeam}</strong>
            </div>
            <div className="rounded-2xl bg-white/12 p-4">
              <p className="text-xs text-white/70">현재 점수</p>
              <strong className="mt-2 block text-lg">
                {detailPreview.awayScore ?? 0} : {detailPreview.homeScore ?? 0}
              </strong>
            </div>
            <div className="rounded-2xl bg-white/12 p-4">
              <p className="text-xs text-white/70">홈팀</p>
              <strong className="mt-2 block text-lg">{detailPreview.homeTeam}</strong>
            </div>
          </div>
        </div>
      </section>

      <SectionCard
        title="경기 정보"
        subtitle="현재 편집 중인 경기의 기본 정보와 자동 계산 중간 결과입니다."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <div className="rounded-3xl bg-soft p-4">
            <p className="text-xs font-semibold text-muted">경기 정보</p>
            <div className="mt-3 space-y-2 text-sm text-foreground">
              <p>{game.date} {game.time}</p>
              <p>{game.stadium}</p>
              <p>{detailPreview.awayTeam} vs {detailPreview.homeTeam}</p>
              <p>상태: {game.status}</p>
            </div>
          </div>

          <div className="rounded-3xl bg-soft p-4 text-center">
            <p className="text-xs font-semibold text-muted">스코어보드</p>
            <p className="mt-3 text-3xl font-bold text-primary">
              {detailPreview.awayScore ?? 0} : {detailPreview.homeScore ?? 0}
            </p>
            <p className="mt-2 text-xs text-muted">
              {editableRecord.saveStatus === "saved" ? "저장됨" : "작성 중"}
            </p>
          </div>

          <div className="rounded-3xl bg-soft p-4">
            <p className="text-xs font-semibold text-muted">라인스코어 미리보기</p>
            <div className="mt-3 grid grid-cols-[60px_repeat(9,28px)] gap-1 text-[11px]">
              <span className="font-semibold text-muted">이닝</span>
              {detailPreview.lineScore.innings.map((inning) => (
                <span key={inning} className="text-center font-semibold text-muted">
                  {inning}
                </span>
              ))}
              <span className="font-semibold text-foreground">원정</span>
              {detailPreview.lineScore.awayRuns.map((run, index) => (
                <span key={`away-${index}`} className="rounded bg-white px-1 py-1 text-center">
                  {run}
                </span>
              ))}
              <span className="font-semibold text-foreground">홈</span>
              {detailPreview.lineScore.homeRuns.map((run, index) => (
                <span key={`home-${index}`} className="rounded bg-white px-1 py-1 text-center">
                  {run}
                </span>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="타자 기록 입력"
        subtitle="셀을 클릭해 기록을 입력합니다. Enter 선택, Tab 다음 타자, +로 추가 기록을 입력할 수 있습니다."
      >
        <div className="space-y-6">
          <BattingRecordTable
            title={detailPreview.awayTeam}
            teamKey="away"
            playerOptions={awayTeamPlayers}
            rows={editableRecord.away.batters}
            computedRows={awayBatting}
            activeCell={activeCell}
            isPitcherAssignmentActive={pitchingAssignmentTarget === "away"}
            onOpenCell={setActiveCell}
            onApplyCode={applyCodeToCell}
            onClearCell={clearCell}
            onAssignCell={handleAssignBatterCell}
            onAddBatter={() =>
              updateBatters("away", (rows) => [
                ...rows,
                createEmptyBatterRow(rows.length + 1, `${detailPreview.awayTeam} 타자 ${rows.length + 1}`),
              ])
            }
            onRemoveBatter={(rowId) =>
              updateBatters("away", (rows) => rows.filter((row) => row.id !== rowId))
            }
            onUpdateRow={(rowId, field, value) =>
              updateBatters("away", (rows) =>
                rows.map((row) =>
                  row.id === rowId ? { ...row, [field]: value } : row,
                ),
              )
            }
          />

          <BattingRecordTable
            title={detailPreview.homeTeam}
            teamKey="home"
            playerOptions={homeTeamPlayers}
            rows={editableRecord.home.batters}
            computedRows={homeBatting}
            activeCell={activeCell}
            isPitcherAssignmentActive={pitchingAssignmentTarget === "home"}
            onOpenCell={setActiveCell}
            onApplyCode={applyCodeToCell}
            onClearCell={clearCell}
            onAssignCell={handleAssignBatterCell}
            onAddBatter={() =>
              updateBatters("home", (rows) => [
                ...rows,
                createEmptyBatterRow(rows.length + 1, `${detailPreview.homeTeam} 타자 ${rows.length + 1}`),
              ])
            }
            onRemoveBatter={(rowId) =>
              updateBatters("home", (rows) => rows.filter((row) => row.id !== rowId))
            }
            onUpdateRow={(rowId, field, value) =>
              updateBatters("home", (rows) =>
                rows.map((row) =>
                  row.id === rowId ? { ...row, [field]: value } : row,
                ),
              )
            }
          />
        </div>
      </SectionCard>

      <SectionCard
        title="투수 기록 요약"
        subtitle="투수 순번 버튼을 누른 뒤 상대 타자 기록 셀에서 마지막 타자를 지정하면 자동 구간 계산이 반영됩니다."
      >
        <div className="space-y-6">
          <PitchingRecordTable
            title={detailPreview.awayTeam}
            teamKey="away"
            playerOptions={awayTeamPlayers}
            rows={editableRecord.away.pitchers}
            computedRows={awayPitching}
            assignmentMode={pitcherAssignmentMode?.team === "away" ? pitcherAssignmentMode.pitcherId : null}
            onSelectPitcherAssignment={(pitcherId) =>
              handleSelectPitcherForAssignment("away", pitcherId)
            }
            onClearPitcherAssignment={(pitcherId) => clearPitcherAssignment("away", pitcherId)}
            onAddPitcher={() =>
              updatePitchers("away", (rows) => [
                ...rows,
                { id: createId("pitcher"), name: `${detailPreview.awayTeam} 투수 ${rows.length + 1}`, role: "구원" },
              ])
            }
            onRemovePitcher={(rowId) =>
              removePitcherRow("away", rowId)
            }
            onUpdatePitcher={(rowId, field, value) =>
              updatePitchers("away", (rows) =>
                rows.map((row) =>
                  row.id === rowId ? { ...row, [field]: value } : row,
                ),
              )
            }
          />
          <PitchingRecordTable
            title={detailPreview.homeTeam}
            teamKey="home"
            playerOptions={homeTeamPlayers}
            rows={editableRecord.home.pitchers}
            computedRows={homePitching}
            assignmentMode={pitcherAssignmentMode?.team === "home" ? pitcherAssignmentMode.pitcherId : null}
            onSelectPitcherAssignment={(pitcherId) =>
              handleSelectPitcherForAssignment("home", pitcherId)
            }
            onClearPitcherAssignment={(pitcherId) => clearPitcherAssignment("home", pitcherId)}
            onAddPitcher={() =>
              updatePitchers("home", (rows) => [
                ...rows,
                { id: createId("pitcher"), name: `${detailPreview.homeTeam} 투수 ${rows.length + 1}`, role: "구원" },
              ])
            }
            onRemovePitcher={(rowId) =>
              removePitcherRow("home", rowId)
            }
            onUpdatePitcher={(rowId, field, value) =>
              updatePitchers("home", (rows) =>
                rows.map((row) =>
                  row.id === rowId ? { ...row, [field]: value } : row,
                ),
              )
            }
          />
        </div>
      </SectionCard>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => handleSave("draft")}
          className="rounded-full border border-line bg-card px-5 py-3 text-sm font-semibold text-foreground"
        >
          임시저장
        </button>
        <button
          type="button"
          onClick={() => handleSave("saved")}
          className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(19,60,115,0.22)]"
        >
          저장
        </button>
        <Link
          href="/admin"
          className="rounded-full border border-line bg-card px-5 py-3 text-sm font-medium text-foreground"
        >
          관리자 목록으로
        </Link>
        {pitcherAssignmentMode ? (
          <button
            type="button"
            onClick={() => {
              setPitcherAssignmentMode(null);
              setMessage({
                type: "success",
                text: "투수 구간 지정 모드를 해제했습니다.",
              });
            }}
            className="rounded-full border border-line bg-card px-5 py-3 text-sm font-semibold text-foreground"
          >
            투수 지정 해제
          </button>
        ) : null}
        {message ? (
          <span
            className={`rounded-full px-4 py-2 text-sm ${
              message.type === "success"
                ? "bg-[#e8f4ec] text-[#17643a]"
                : "bg-[#fff1f1] text-[#a83333]"
            }`}
          >
            {message.text}
          </span>
        ) : null}
      </div>
    </main>
  );
}

function BattingRecordTable({
  title,
  teamKey,
  playerOptions,
  rows,
  computedRows,
  activeCell,
  onOpenCell,
  isPitcherAssignmentActive,
  onAssignCell,
  onApplyCode,
  onClearCell,
  onAddBatter,
  onRemoveBatter,
  onUpdateRow,
}: Readonly<{
  title: string;
  teamKey: "away" | "home";
  playerOptions: string[];
  rows: BatterRecordRow[];
  computedRows: Array<{
    name: string;
    ab: number;
    runs: number;
    hits: number;
    rbi: number;
    avg: string;
  }>;
  activeCell: ActiveCellState | null;
  isPitcherAssignmentActive: boolean;
  onOpenCell: (value: ActiveCellState | null) => void;
  onAssignCell: (team: "away" | "home", rowId: string, inningIndex: number) => void;
  onApplyCode: (code: string) => void;
  onClearCell: (team: "away" | "home", rowId: string, inningIndex: number) => void;
  onAddBatter: () => void;
  onRemoveBatter: (rowId: string) => void;
  onUpdateRow: (
    rowId: string,
    field: "battingOrder" | "playerName" | "position",
    value: string | number,
  ) => void;
}>) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted">타순, 포지션, 이닝별 결과를 입력합니다.</p>
        </div>
        <button
          type="button"
          onClick={onAddBatter}
          className="rounded-full border border-line bg-card px-4 py-2 text-xs font-semibold text-primary"
        >
          + 타자 추가
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line">
          <div className="min-w-[1040px]">
          <div className="grid grid-cols-[36px_108px_92px_repeat(9,42px)_44px_44px_44px_44px_58px_44px] items-center bg-[#e4ebf5] px-2 py-2 text-[10px] font-semibold text-muted">
            <span>타순</span>
            <span>야수명</span>
            <span>포지션</span>
            {["1회", "2회", "3회", "4회", "5회", "6회", "7회", "8회", "9회"].map(
              (inning) => (
                <span key={`${title}-${inning}`} className="text-center">
                  {inning}
                </span>
              ),
            )}
            <span className="text-right">타수</span>
            <span className="text-right">안타</span>
            <span className="text-right">득점</span>
            <span className="text-right">타점</span>
            <span className="text-right">타율</span>
            <span className="text-right">삭제</span>
          </div>

          <div className="divide-y divide-line bg-card">
            {rows.map((row, rowIndex) => {
              const computed = computedRows[rowIndex];
              return (
                <div
                  key={row.id}
                  className={`grid grid-cols-[36px_108px_92px_repeat(9,42px)_44px_44px_44px_44px_58px_44px] items-stretch px-2 py-0 text-[11px] ${
                    rowIndex % 2 === 0 ? "bg-white" : "bg-[#fbfcfe]"
                  }`}
                >
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={row.battingOrder}
                      onChange={(event) =>
                        onUpdateRow(row.id, "battingOrder", Number(event.target.value))
                      }
                      className="h-8 w-full rounded-lg border border-line bg-white px-2 text-[11px] leading-none text-center"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={row.playerName}
                      list={`batter-${teamKey}-${row.id}`}
                      onChange={(event) =>
                        onUpdateRow(row.id, "playerName", event.target.value)
                      }
                      className="h-8 w-full rounded-lg border border-line bg-white px-2 text-[12px] leading-none"
                      placeholder="선수 선택 또는 입력"
                    />
                    {playerOptions.length > 0 ? (
                      <datalist id={`batter-${teamKey}-${row.id}`}>
                        {playerOptions.map((playerName) => (
                          <option key={`${row.id}-${playerName}`} value={playerName} />
                        ))}
                      </datalist>
                    ) : null}
                  </div>
                  <div className="flex items-center">
                    <select
                      value={toPositionCode(row.position)}
                      onChange={(event) =>
                        onUpdateRow(row.id, "position", event.target.value)
                      }
                      className="h-8 w-full min-w-0 rounded-lg border border-line bg-white px-2 py-0.5 text-[12px] leading-none"
                    >
                      {POSITION_OPTIONS.map((option) => (
                        <option key={`${row.id}-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {row.inningResults.map((entries, inningIndex) => (
                    <RecordCell
                      key={`${row.id}-${inningIndex}`}
                      allowAssignment={isPitcherAssignmentActive}
                      entries={entries}
                      isActive={
                        activeCell?.team === teamKey &&
                        activeCell.rowId === row.id &&
                        activeCell.inningIndex === inningIndex
                      }
                      onAssign={() =>
                        isPitcherAssignmentActive
                          ? onAssignCell(teamKey, row.id, inningIndex)
                          : onOpenCell({
                              team: teamKey,
                              rowId: row.id,
                              inningIndex,
                              mode: "replace",
                            })
                      }
                      onOpen={(mode) =>
                        onOpenCell({
                          team: teamKey,
                          rowId: row.id,
                          inningIndex,
                          mode,
                        })
                      }
                      onClose={() => onOpenCell(null)}
                      onApplyCode={onApplyCode}
                      onClear={() => onClearCell(teamKey, row.id, inningIndex)}
                      onClearCurrent={() => onClearCell(teamKey, row.id, inningIndex)}
                    />
                  ))}

                  <span className="flex items-center justify-end">{computed?.ab ?? 0}</span>
                  <span className="flex items-center justify-end">{computed?.hits ?? 0}</span>
                  <span className="flex items-center justify-end">{computed?.runs ?? 0}</span>
                  <span className="flex items-center justify-end">{computed?.rbi ?? 0}</span>
                  <span className="flex items-center justify-end font-semibold text-primary">
                    {computed?.avg ?? ".000"}
                  </span>
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => onRemoveBatter(row.id)}
                      className="rounded-md border border-line px-2 py-0.5 text-[10px] font-semibold text-[#a83333]"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function PitchingRecordTable({
  title,
  teamKey,
  playerOptions,
  rows,
  computedRows,
  assignmentMode,
  onSelectPitcherAssignment,
  onClearPitcherAssignment,
  onAddPitcher,
  onRemovePitcher,
  onUpdatePitcher,
}: Readonly<{
  title: string;
  teamKey: "away" | "home";
  playerOptions: string[];
  rows: PitcherRecordRow[];
  computedRows: Array<{
    ip: string;
    hitsAllowed: number;
    runs: number;
    earnedRuns: number;
    walks: number;
    strikeouts: number;
    pitches: number;
  }>;
  assignmentMode: string | null;
  onSelectPitcherAssignment: (pitcherId: string) => void;
  onClearPitcherAssignment: (pitcherId: string) => void;
  onAddPitcher: () => void;
  onRemovePitcher: (rowId: string) => void;
  onUpdatePitcher: (
    rowId: string,
    field: "name" | "role",
    value: string,
  ) => void;
}>) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted">타자 기록을 바탕으로 기본 집계합니다.</p>
        </div>
        <button
          type="button"
          onClick={onAddPitcher}
          className="rounded-full border border-line bg-card px-4 py-2 text-xs font-semibold text-primary"
        >
          + 투수 추가
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line">
          <div className="min-w-[860px]">
          <div className="grid grid-cols-[34px_106px_74px_56px_52px_52px_52px_52px_52px_66px_48px] items-center bg-soft px-2 py-2 text-[10px] font-semibold text-muted">
            <span>순번</span>
            <span>투수명</span>
            <span>역할</span>
            <span className="text-right">이닝</span>
            <span className="text-right">피안타</span>
            <span className="text-right">실점</span>
            <span className="text-right">자책</span>
            <span className="text-right">볼넷</span>
            <span className="text-right">삼진</span>
            <span className="text-right">투구수</span>
            <span className="text-right">삭제</span>
          </div>

          <div className="divide-y divide-line bg-card">
            {rows.map((row, index) => {
              const computed = computedRows[index];

              return (
                <div
                  key={row.id}
                  className="grid grid-cols-[34px_106px_74px_56px_52px_52px_52px_52px_52px_66px_48px] items-center px-2 py-1.5 text-[11px]"
                >
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => onSelectPitcherAssignment(row.id)}
                      className={`h-7 w-7 rounded-full border text-[10px] font-semibold ${
                        assignmentMode === row.id
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-line bg-white text-muted hover:border-primary/60 hover:text-primary"
                      }`}
                    >
                      {index + 1}
                    </button>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={row.name}
                      list={`pitcher-${teamKey}-${row.id}`}
                      onChange={(event) =>
                        onUpdatePitcher(row.id, "name", event.target.value)
                      }
                      className="h-7 rounded-lg border border-line bg-white px-2 text-[12px] leading-none"
                      placeholder="선수 선택 또는 입력"
                    />
                    {playerOptions.length > 0 ? (
                      <datalist id={`pitcher-${teamKey}-${row.id}`}>
                        {playerOptions.map((playerName) => (
                          <option key={`${row.id}-${playerName}`} value={playerName} />
                        ))}
                      </datalist>
                    ) : null}
                  </div>
                  <input
                    type="text"
                    value={row.role}
                    onChange={(event) =>
                      onUpdatePitcher(row.id, "role", event.target.value)
                    }
                    className="h-7 rounded-lg border border-line bg-white px-2 text-[12px] leading-none"
                  />
                  <span className="text-right font-semibold text-primary">{computed?.ip ?? "0.0"}</span>
                  <span className="text-right">{computed?.hitsAllowed ?? 0}</span>
                  <span className="text-right">{computed?.runs ?? 0}</span>
                  <span className="text-right">{computed?.earnedRuns ?? 0}</span>
                  <span className="text-right">{computed?.walks ?? 0}</span>
                  <span className="text-right">{computed?.strikeouts ?? 0}</span>
                  <span className="text-right">{computed?.pitches ?? 0}</span>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onClearPitcherAssignment(row.id)}
                      className="rounded-md border border-line px-2 py-0.5 text-[10px] font-semibold text-muted"
                    >
                      구간해제
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemovePitcher(row.id)}
                      className="rounded-md border border-line px-2 py-0.5 text-[10px] font-semibold text-[#a83333]"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function RecordCell({
  entries,
  isActive,
  allowAssignment,
  onAssign,
  onOpen,
  onClose,
  onApplyCode,
  onClear,
  onClearCurrent,
}: Readonly<{
  entries: Array<{ id: string; code: string }>;
  isActive: boolean;
  allowAssignment: boolean;
  onAssign: () => void;
  onOpen: (mode: "replace" | "append") => void;
  onClose: () => void;
  onApplyCode: (code: string) => void;
  onClear: () => void;
  onClearCurrent: () => void;
}>) {
  return (
    <div className="group relative flex min-h-0 items-center justify-center border-l border-line first:border-l-0">
      <button
        type="button"
        onClick={() => onOpen("replace")}
        className="flex h-8 w-full min-w-0 items-center justify-center bg-white px-1 text-center text-[10px] leading-tight text-foreground hover:bg-[#f4f7fb]"
      >
        <span className="line-clamp-2">
          {entries.length > 0 ? entries.map((entry) => entry.code).join(" + ") : ""}
        </span>
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (allowAssignment) {
            onAssign();
          } else {
            onOpen("append");
          }
        }}
        className="absolute right-1 top-1 rounded-full bg-primary/10 px-1 py-0.5 text-[9px] font-bold text-primary opacity-0 transition-opacity group-hover:opacity-100"
      >
        +
      </button>
      {entries.length > 0 ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClear();
          }}
          className="absolute left-1 top-1 rounded-full bg-[#fff1f1] px-1 py-0.5 text-[9px] font-bold text-[#a83333] opacity-0 transition-opacity group-hover:opacity-100"
        >
          ×
        </button>
      ) : null}
      {isActive ? (
        <RecordCodeEditor
          initialValue={entries[0]?.code ?? ""}
          onClose={onClose}
          onSelect={onApplyCode}
          onClearCurrent={onClearCurrent}
        />
      ) : null}
    </div>
  );
}

function RecordCodeEditor({
  initialValue,
  onClose,
  onSelect,
  onClearCurrent,
}: Readonly<{
  initialValue: string;
  onClose: () => void;
  onSelect: (code: string) => void;
  onClearCurrent: () => void;
}>) {
  const [query, setQuery] = useState(initialValue);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const suggestions = searchRecordCodes(query);
  type SuggestionRow = RecordCodeDefinition & { index: number };

  const groupedSuggestions = (() => {
    const sectionOrder: Array<{ section: string; order: number; items: SuggestionRow[]; codes: Set<string> }> = [];
    const sectionMap = new Map<string, typeof sectionOrder[number]>();

    suggestions.forEach((item, index) => {
    const section = recordCodeCategoryLabel[item.category];
      const existing = sectionMap.get(section);
      if (existing) {
        if (!existing.codes.has(item.code)) {
          existing.items.push({ ...item, index });
          existing.codes.add(item.code);
        }
        return;
      }

      const group = {
        section,
        order: sectionOrder.length,
        items: [{ ...item, index }],
        codes: new Set([item.code]),
      };
      sectionOrder.push(group);
      sectionMap.set(section, group);
    });

    return sectionOrder
      .sort((a, b) => a.order - b.order)
      .map(({ section, items }) => ({ section, items }));
  })();

  const maxIndex = Math.max(suggestions.length - 1, 0);

  return (
    <div className="absolute left-1/2 top-full z-20 mt-2 w-[min(26rem,88vw)] rounded-xl border border-line bg-white p-2 shadow-[0_14px_26px_rgba(16,35,63,0.18)]">
      <div className="relative">
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlightedIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlightedIndex((current) =>
                Math.min(current + 1, maxIndex),
              );
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlightedIndex((current) => Math.max(current - 1, 0));
            }

            if (event.key === "Enter") {
              event.preventDefault();
              const target = suggestions[highlightedIndex] ?? suggestions[0];
              if (target) {
                onSelect(target.code);
              }
            }

            if (event.key === "Tab") {
              event.preventDefault();
              const target = suggestions[highlightedIndex] ?? suggestions[0];
              if (target) {
                onSelect(target.code);
              } else {
                onClose();
              }
            }

            if (event.key === "Escape") {
              event.preventDefault();
              onClose();
            }
          }}
          placeholder="예: ㅈㅇ, 좌안, 삼진"
          className="h-8 w-full rounded-lg border border-line bg-white px-3 pr-8 text-[12px] leading-none outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => {
            onClearCurrent();
            onClose();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[#fff1f1] px-1.5 py-0.5 text-[10px] font-bold text-[#a83333]"
        >
          x
        </button>
      </div>
      <div className="mt-2 max-h-[18rem] overflow-y-auto pr-1">
        {groupedSuggestions.length === 0 ? (
          <p className="px-3 py-3 text-center text-xs text-muted">검색 결과가 없습니다.</p>
        ) : (
          groupedSuggestions.map((group) => (
            <div key={group.section} className="mb-2 last:mb-0">
              <p className="sticky top-0 z-10 mb-1 border-b border-line bg-white px-2 py-1.5 text-[11px] font-semibold tracking-wide text-muted">
                {group.section}
              </p>
              <div className="space-y-1">
                {group.items.map((entry) => (
                  <button
                    type="button"
                    key={`${group.section}-${entry.code}-${entry.index}`}
                    onMouseEnter={() => setHighlightedIndex(entry.index)}
                    onClick={() => onSelect(entry.code)}
                    className={
                      entry.index === highlightedIndex
                        ? "grid w-full grid-cols-[3.5rem_1fr_auto] items-center gap-2 rounded-lg bg-soft px-2 py-1.5 text-left text-[12px] leading-4 text-foreground ring-1 ring-primary/25"
                        : "grid w-full grid-cols-[3.5rem_1fr_auto] items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] leading-4 text-foreground hover:bg-soft"
                    }
                  >
                    <span className="truncate font-medium text-foreground">{entry.code}</span>
                    <span className="truncate text-foreground">{entry.label}</span>
                    <span className="shrink-0 text-[11px] whitespace-nowrap text-muted">{entry.aliases[0] ?? ""}</span>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function createEmptyBatterRow(order: number, name: string): BatterRecordRow {
  return {
    id: createId("batter"),
    battingOrder: order,
    playerName: name,
    position: "CF",
    inningResults: Array.from({ length: 9 }, () => []),
  };
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function cloneRecord(record: SavedGameRecord): SavedGameRecord {
  return {
    ...record,
    away: {
      ...record.away,
      pitcherAssignments: { ...(record.away.pitcherAssignments ?? {}) },
      batters: record.away.batters.map((row) => ({
        ...row,
        inningResults: row.inningResults.map((entries) => entries.map((entry) => ({ ...entry }))),
      })),
      pitchers: record.away.pitchers.map((row) => ({ ...row })),
    },
    home: {
      ...record.home,
      pitcherAssignments: { ...(record.home.pitcherAssignments ?? {}) },
      batters: record.home.batters.map((row) => ({
        ...row,
        inningResults: row.inningResults.map((entries) => entries.map((entry) => ({ ...entry }))),
      })),
      pitchers: record.home.pitchers.map((row) => ({ ...row })),
    },
  };
}

function getTeamPlayerNames(teams: TeamConfig[], teamId?: string) {
  if (!teamId) {
    return [];
  }

  const team = teams.find((item) => item.id === teamId);
  return [...new Set((team?.players ?? []).filter(Boolean))].sort();
}

function getTargetPitchingTeam(active: "away" | "home" | null): "away" | "home" | null {
  if (active === "away") {
    return "home";
  }

  if (active === "home") {
    return "away";
  }

  return null;
}

function findPitcherName(pitchers: PitcherRecordRow[], pitcherId: string) {
  return pitchers.find((pitcher) => pitcher.id === pitcherId)?.name ?? "투수";
}
