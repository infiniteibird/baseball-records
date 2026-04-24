"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { StoredGame, TeamConfig } from "@/data/types";
import { useBaseballData } from "@/store/baseball-context";

export function AdminGameForm() {
  const {
    state,
    recentAdminGames,
    saveGames,
    saveTeams,
    resetState,
  } = useBaseballData();
  const [selectedGameId, setSelectedGameId] = useState<string>(
    state.games[0]?.id ?? "",
  );
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    state.teams[0]?.id ?? "",
  );
  const [teamDrafts, setTeamDrafts] = useState<TeamConfig[] | null>(null);
  const [gameDrafts, setGameDrafts] = useState<StoredGame[] | null>(null);
  const [gameStatusFilter, setGameStatusFilter] = useState<
    "전체" | "예정" | "종료" | "진행중"
  >("전체");
  const [gameDateFilter, setGameDateFilter] = useState("전체");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [playerListPage, setPlayerListPage] = useState(1);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const editableTeams = teamDrafts ?? state.teams;
  const editableGames = gameDrafts ?? state.games;
  const teamNameMap = useMemo(
    () => new Map(editableTeams.map((team) => [team.id, team.name] as const)),
    [editableTeams],
  );
  const usedTeamIds = useMemo(
    () =>
      new Set(
        editableGames.flatMap((game) => [game.homeTeamId, game.awayTeamId]),
      ),
    [editableGames],
  );
  const hasTeamDraftChanges = teamDrafts !== null;
  const hasGameDraftChanges = gameDrafts !== null;
  const gameDateOptions = useMemo(
    () =>
      Array.from(
        new Set(
          editableGames
            .map((game) => game.date.trim())
            .filter((date) => date.length > 0),
        ),
      ).sort((left, right) => right.localeCompare(left)),
    [editableGames],
  );

  const filteredGames = useMemo(() => {
    return editableGames.filter((game) => {
      const matchesStatus =
        gameStatusFilter === "전체" ? true : game.status === gameStatusFilter;
      const matchesDate =
        gameDateFilter === "전체" ? true : game.date === gameDateFilter;

      return matchesStatus && matchesDate;
    });
  }, [editableGames, gameDateFilter, gameStatusFilter]);

  const selectedGame = filteredGames.find((game) => game.id === selectedGameId) ??
    filteredGames[0];
  const selectedGameIdForDisplay = selectedGame?.id ?? selectedGameId;
  const selectedTeam =
    editableTeams.find((team) => team.id === selectedTeamId) ?? editableTeams[0];
  const playersPerPage = 10;
  const selectedTeamPlayers = selectedTeam?.players ?? [];
  const totalPlayerPages = Math.max(1, Math.ceil(selectedTeamPlayers.length / playersPerPage));
  const currentPlayerPage = Math.min(playerListPage, totalPlayerPages);
  const pagedPlayers = selectedTeamPlayers.slice(
    (currentPlayerPage - 1) * playersPerPage,
    currentPlayerPage * playersPerPage,
  );

  function updateTeamDrafts(
    updater: (teams: TeamConfig[]) => TeamConfig[],
  ) {
    setTeamDrafts((current) => updater(cloneTeams(current ?? state.teams)));
  }

  function updateGameDrafts(
    updater: (games: StoredGame[]) => StoredGame[],
  ) {
    setGameDrafts((current) => updater(cloneGames(current ?? state.games)));
  }

  function updateSelectedGame(updater: (game: StoredGame) => StoredGame) {
    if (!selectedGame) {
      return;
    }

    updateGameDrafts((current) =>
      current.map((game) =>
        game.id === selectedGame.id ? updater(game) : game,
      ),
    );
  }

  function handleAddGame() {
    const nextGame = createNewGameDraft(editableTeams);

    updateGameDrafts((current) => [nextGame, ...current]);
    setSelectedGameId(nextGame.id);
    setMessage({
      type: "success",
      text: "새 경기 초안을 추가했습니다. 저장해야 전체 사이트에 반영됩니다.",
    });
  }

  function handleDeleteGame() {
    if (!selectedGame) {
      return;
    }

    const nextGames = editableGames.filter((game) => game.id !== selectedGame.id);
    setGameDrafts(nextGames);
    setSelectedGameId(nextGames[0]?.id ?? "");
    setMessage({
      type: "success",
      text: "선택한 경기 초안을 삭제했습니다. 저장해야 전체 사이트에 반영됩니다.",
    });
  }

  function handleSaveGames() {
    if (hasTeamDraftChanges) {
      setMessage({
        type: "error",
        text: "팀 초안이 저장되지 않았습니다. 먼저 팀/선수 저장을 눌러 주세요.",
      });
      return;
    }

    const validationError = validateGames(editableGames, editableTeams);
    if (validationError) {
      setMessage({
        type: "error",
        text: validationError,
      });
      return;
    }

    saveGames(editableGames);
    setGameDrafts(null);
    setMessage({
      type: "success",
      text: "경기 변경사항을 저장하고 사이트 전체에 반영했습니다.",
    });
  }

  function getStatusFilterButtonClass(status: "전체" | "예정" | "종료" | "진행중") {
    return gameStatusFilter === status
      ? "rounded-2xl bg-primary text-white px-3 py-2 text-xs font-semibold"
      : "rounded-2xl bg-card text-primary px-3 py-2 text-xs font-semibold";
  }

  function handleAddPlayer() {
    if (!selectedTeam) {
      return;
    }

    const trimmedName = newPlayerName.trim();
    if (!trimmedName) {
      setMessage({
        type: "error",
        text: "추가할 선수 이름을 입력해 주세요.",
      });
      return;
    }

    updateTeamDrafts((current) =>
      current.map((team) =>
        team.id === selectedTeam.id
          ? {
              ...team,
              players: [...team.players, trimmedName],
            }
          : team,
      ),
    );
    setNewPlayerName("");
    setPlayerListPage(Math.ceil((selectedTeam.players.length + 1) / playersPerPage));
    setMessage({
      type: "success",
      text: `${selectedTeam.name} 선수 명단 초안에 ${trimmedName} 선수를 추가했습니다.`,
    });
  }

  function handleAddTeam() {
    const nextName = createNextTeamName(editableTeams);
    const nextTeamId = `team-${Date.now()}`;

    updateTeamDrafts((current) => [
      ...current,
      {
        id: nextTeamId,
        name: nextName,
        players: [],
      },
    ]);
    setSelectedTeamId(nextTeamId);
    setPlayerListPage(1);
    setMessage({
      type: "success",
      text: `${nextName} 팀 초안을 추가했습니다. 저장해야 전체 사이트에 반영됩니다.`,
    });
  }

  function handleDeleteTeam() {
    if (!selectedTeam) {
      return;
    }

    if (editableTeams.length === 1) {
      setMessage({
        type: "error",
        text: "마지막 남은 팀은 삭제할 수 없습니다.",
      });
      return;
    }

    if (usedTeamIds.has(selectedTeam.id)) {
      setMessage({
        type: "error",
        text: "현재 경기 초안에서 사용 중인 팀은 삭제할 수 없습니다.",
      });
      return;
    }

    const nextTeams = editableTeams.filter((team) => team.id !== selectedTeam.id);
    setTeamDrafts(nextTeams);
    setSelectedTeamId(nextTeams[0]?.id ?? "");
    setPlayerListPage(1);
    setNewPlayerName("");
    setMessage({
      type: "success",
      text: `${selectedTeam.name} 팀 초안을 삭제했습니다. 저장해야 전체 사이트에 반영됩니다.`,
    });
  }

  function handleSaveTeams() {
    const validationError = validateTeams(editableTeams);

    if (validationError) {
      setMessage({
        type: "error",
        text: validationError,
      });
      return;
    }

    saveTeams(editableTeams);
    setTeamDrafts(null);
    setMessage({
      type: "success",
      text: "팀 이름과 선수 명단 변경사항을 저장하고 사이트 전체에 반영했습니다.",
    });
  }

  function handleReset() {
    resetState();
    setSelectedGameId("");
    setSelectedTeamId("");
    setTeamDrafts(null);
    setGameDrafts(null);
    setNewPlayerName("");
    setPlayerListPage(1);
    setMessage({
      type: "success",
      text: "관리자 상태를 초기 mock 상태로 되돌렸습니다.",
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-5">
        <section className="rounded-[28px] border border-line bg-card p-5 shadow-[0_16px_40px_rgba(16,35,63,0.08)] sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              경기 입력 / 수정 / 삭제
            </h2>
            <p className="mt-1 text-sm text-muted">
              예정 경기와 종료 경기를 모두 보고 수정할 수 있습니다. 저장 버튼을
              눌렀을 때만 사이트 전체에 반영됩니다.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(280px,0.9fr)_minmax(0,2.1fr)]">
            <div className="rounded-3xl bg-soft p-3">
              <div className="mb-3 flex items-center justify-between gap-3 px-2">
                <p className="text-xs font-semibold text-muted">전체 경기 목록</p>
                <span className="text-xs text-muted">{filteredGames.length}경기</span>
              </div>
              <label className="mb-3 block px-2">
                <span className="mb-2 block text-xs font-semibold text-muted">
                  날짜 선택
                </span>
                <select
                  value={gameDateFilter}
                  onChange={(event) => {
                    setGameDateFilter(event.target.value);
                    setSelectedGameId("");
                  }}
                  className="h-11 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground outline-none transition-colors focus:border-primary"
                >
                  <option value="전체">전체 날짜</option>
                  {gameDateOptions.map((date) => (
                    <option key={`game-date-${date}`} value={date}>
                      {date}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGameStatusFilter("전체")}
                  className={getStatusFilterButtonClass("전체")}
                >
                  전체
                </button>
                <button
                  type="button"
                  onClick={() => setGameStatusFilter("예정")}
                  className={getStatusFilterButtonClass("예정")}
                >
                  예정 경기
                </button>
                <button
                  type="button"
                  onClick={() => setGameStatusFilter("종료")}
                  className={getStatusFilterButtonClass("종료")}
                >
                  종료 경기
                </button>
                <button
                  type="button"
                  onClick={() => setGameStatusFilter("진행중")}
                  className={getStatusFilterButtonClass("진행중")}
                >
                  진행중 경기
                </button>
              </div>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleAddGame}
                  className="rounded-2xl bg-card px-3 py-2 text-xs font-semibold text-primary"
                >
                  경기 추가
                </button>
                <button
                  type="button"
                  onClick={handleDeleteGame}
                  className="rounded-2xl bg-card px-3 py-2 text-xs font-semibold text-[#a83333]"
                >
                  경기 삭제
                </button>
              </div>

              <div className="space-y-2">
                {filteredGames.map((game) => {
                  const isActive = selectedGameIdForDisplay === game.id;

                  return (
                    <article
                      key={game.id}
                      className={
                        isActive
                          ? "rounded-2xl bg-primary px-4 py-3 text-white"
                          : "rounded-2xl bg-card px-4 py-3 text-foreground"
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedGameId(game.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate text-sm font-semibold">
                              {displayTeamName(game.awayTeamId, teamNameMap)} vs{" "}
                              {displayTeamName(game.homeTeamId, teamNameMap)}
                            </span>
                            <span
                              className={
                                isActive
                                  ? "rounded-full bg-white/15 px-2 py-1 text-[11px] font-semibold text-white"
                                  : "rounded-full bg-soft px-2 py-1 text-[11px] font-semibold text-primary"
                              }
                            >
                              {game.status}
                            </span>
                          </div>
                          <p
                            className={
                              isActive
                                ? "mt-1 text-xs text-white/75"
                                : "mt-1 text-xs text-muted"
                            }
                          >
                            {game.date} {game.time} · {game.stadium}
                          </p>
                        </button>
                        <Link
                          href={`/admin/games/${game.id}/record`}
                          className={
                            isActive
                              ? "inline-flex shrink-0 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white"
                              : "inline-flex shrink-0 rounded-full border border-line bg-soft px-3 py-1.5 text-xs font-semibold text-primary"
                          }
                        >
                          기록하기
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="space-y-5">
              {selectedGame ? (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-muted">
                        원정팀
                      </span>
                      <select
                        value={selectedGame.awayTeamId}
                        onChange={(event) =>
                          updateSelectedGame((game) => ({
                            ...markGameAsEdited(game),
                            awayTeamId: event.target.value,
                          }))
                        }
                        className="h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground outline-none transition-colors focus:border-primary"
                      >
                        {editableTeams.map((team) => (
                          <option key={`away-${team.id}`} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-muted">
                        홈팀
                      </span>
                      <select
                        value={selectedGame.homeTeamId}
                        onChange={(event) =>
                          updateSelectedGame((game) => ({
                            ...markGameAsEdited(game),
                            homeTeamId: event.target.value,
                          }))
                        }
                        className="h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground outline-none transition-colors focus:border-primary"
                      >
                        {editableTeams.map((team) => (
                          <option key={`home-${team.id}`} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-muted">
                        경기 날짜/시간
                      </span>
                      <input
                        type="datetime-local"
                        value={toDateTimeLocalValue(selectedGame)}
                        onChange={(event) => {
                          const nextDateTime = parseDateTimeLocalValue(event.target.value);
                          updateSelectedGame((game) => ({
                            ...markGameAsEdited(game),
                            date: nextDateTime.date,
                            time: nextDateTime.time,
                          }));
                        }}
                        className="h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground outline-none transition-colors focus:border-primary"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-muted">
                        장소
                      </span>
                      <input
                        type="text"
                        value={selectedGame.stadium}
                        onChange={(event) =>
                          updateSelectedGame((game) => ({
                            ...markGameAsEdited(game),
                            stadium: event.target.value,
                          }))
                        }
                        placeholder="예: 대운동장 A"
                        className="h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_180px]">
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-muted">
                        원정팀 점수
                      </span>
                      <input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        disabled={selectedGame.status !== "종료"}
                        value={selectedGame.awayScore ?? ""}
                        onChange={(event) =>
                          updateSelectedGame((game) => ({
                            ...markGameAsEdited(game),
                            awayScore:
                              event.target.value === ""
                                ? null
                                : Number(event.target.value),
                          }))
                        }
                        placeholder="예: 6"
                        className="h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted disabled:bg-soft focus:border-primary"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-muted">
                        홈팀 점수
                      </span>
                      <input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        disabled={selectedGame.status !== "종료"}
                        value={selectedGame.homeScore ?? ""}
                        onChange={(event) =>
                          updateSelectedGame((game) => ({
                            ...markGameAsEdited(game),
                            homeScore:
                              event.target.value === ""
                                ? null
                                : Number(event.target.value),
                          }))
                        }
                        placeholder="예: 4"
                        className="h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted disabled:bg-soft focus:border-primary"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-muted">
                        경기 상태
                      </span>
                      <select
                        value={selectedGame.status}
                        onChange={(event) =>
                          updateSelectedGame((game) => ({
                            ...markGameAsEdited(game),
                            status: event.target.value as StoredGame["status"],
                            awayScore:
                              event.target.value === "종료"
                                ? (game.awayScore ?? 0)
                                : null,
                            homeScore:
                              event.target.value === "종료"
                                ? (game.homeScore ?? 0)
                                : null,
                          }))
                        }
                        className="h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground outline-none transition-colors focus:border-primary"
                      >
                        <option value="예정">예정</option>
                        <option value="종료">종료</option>
                        <option value="진행중">진행중</option>
                      </select>
                    </label>
                  </div>

                  <div className="rounded-3xl border border-dashed border-line bg-soft p-4">
                    <p className="text-xs font-semibold text-muted">현재 선택 경기</p>
                    <p className="mt-2 text-sm leading-6 text-foreground">
                      {displayTeamName(selectedGame.awayTeamId, teamNameMap)} vs{" "}
                      {displayTeamName(selectedGame.homeTeamId, teamNameMap)},{" "}
                      {selectedGame.date} {selectedGame.time}, {selectedGame.stadium}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleSaveGames}
                      className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(19,60,115,0.22)]"
                    >
                      경기 저장
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGameDrafts(null);
                        setSelectedGameId(state.games[0]?.id ?? "");
                      }}
                      className="rounded-full border border-line bg-card px-5 py-3 text-sm font-medium text-foreground"
                    >
                      경기 초안 되돌리기
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="rounded-full border border-line bg-card px-5 py-3 text-sm font-medium text-foreground"
                    >
                      전체 초기화
                    </button>
                    <span className="rounded-full bg-card px-3 py-2 text-xs font-semibold text-muted">
                      {hasGameDraftChanges ? "저장 전 경기 변경 있음" : "경기 저장 상태와 동일"}
                    </span>
                  </div>
                </>
              ) : (
                <div className="rounded-3xl bg-soft p-5 text-sm text-muted">
                  등록된 경기가 없습니다. 경기 추가 버튼으로 새 경기를 만들 수 있습니다.
                </div>
              )}
            </div>
          </div>

          {message ? (
            <div
              className={`mt-5 rounded-2xl px-4 py-3 text-sm ${
                message.type === "success"
                  ? "bg-[#e8f4ec] text-[#17643a]"
                  : "bg-[#fff1f1] text-[#a83333]"
              }`}
            >
              {message.text}
            </div>
          ) : null}
        </section>

        <section className="rounded-[28px] border border-line bg-card p-5 shadow-[0_16px_40px_rgba(16,35,63,0.08)] sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              팀 이름 / 선수 명단 관리
            </h2>
            <p className="mt-1 text-sm text-muted">
              이 영역은 먼저 초안을 수정한 뒤 저장 버튼을 눌렀을 때만 사이트
              전체에 반영됩니다.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(240px,0.8fr)_minmax(0,2.2fr)]">
            <div className="rounded-3xl bg-soft p-3">
              <div className="mb-3 flex items-center justify-between gap-3 px-2">
                <p className="text-xs font-semibold text-muted">팀 선택</p>
                <span className="text-xs text-muted">{editableTeams.length}팀</span>
              </div>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleAddTeam}
                  className="rounded-2xl bg-card px-3 py-2 text-xs font-semibold text-primary"
                >
                  팀 추가
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTeam}
                  className="rounded-2xl bg-card px-3 py-2 text-xs font-semibold text-[#a83333]"
                >
                  팀 삭제
                </button>
              </div>
              <div className="space-y-2">
                {editableTeams.map((team) => {
                  const isActive = selectedTeam?.id === team.id;

                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => {
                        setSelectedTeamId(team.id);
                        setPlayerListPage(1);
                      }}
                      className={
                        isActive
                          ? "w-full rounded-2xl bg-primary px-4 py-3 text-left text-sm font-semibold text-white"
                          : "w-full rounded-2xl bg-card px-4 py-3 text-left text-sm font-medium text-foreground"
                      }
                    >
                      <span className="block">{team.name}</span>
                      <span
                        className={
                          isActive
                            ? "mt-1 block text-xs text-white/75"
                            : "mt-1 block text-xs text-muted"
                        }
                      >
                        선수 {team.players.length}명
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-muted">
                  팀 이름
                </span>
                <input
                  type="text"
                  value={selectedTeam?.name ?? ""}
                  onChange={(event) =>
                    updateTeamDrafts((current) =>
                      current.map((team) =>
                        team.id === selectedTeam?.id
                          ? { ...team, name: event.target.value }
                          : team,
                      ),
                    )
                  }
                  placeholder="예: LG"
                  className="h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary"
                />
              </label>

              <div className="rounded-3xl border border-line bg-soft p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      선수 명단
                    </h3>
                    <p className="mt-1 text-xs text-muted">
                      현재는 선수 기록 계산용이 아니라 명단 관리용 UI입니다.
                    </p>
                  </div>
                  <span className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-primary">
                    {selectedTeam?.players.length ?? 0}명
                  </span>
                </div>

                <div className="space-y-3">
                  {pagedPlayers.map((player, pageIndex) => {
                    const index = (currentPlayerPage - 1) * playersPerPage + pageIndex;

                    return (
                    <div
                      key={`${selectedTeam.id}-${index}`}
                      className="grid grid-cols-[minmax(0,1fr)_84px] gap-3"
                    >
                      <input
                        type="text"
                        value={player}
                        onChange={(event) =>
                          updateTeamDrafts((current) =>
                            current.map((team) =>
                              team.id === selectedTeam.id
                                ? {
                                    ...team,
                                    players: team.players.map((teamPlayer, teamIndex) =>
                                      teamIndex === index
                                        ? event.target.value
                                        : teamPlayer,
                                    ),
                                  }
                                : team,
                            ),
                          )
                        }
                        className="h-11 rounded-2xl border border-line bg-white px-4 text-sm text-foreground outline-none transition-colors focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateTeamDrafts((current) =>
                            current.map((team) =>
                              team.id === selectedTeam.id
                                ? {
                                    ...team,
                                    players: team.players.filter(
                                      (_, teamIndex) => teamIndex !== index,
                                    ),
                                  }
                                : team,
                            ),
                          )
                        }
                        className="rounded-2xl border border-line bg-card px-3 text-sm font-medium text-foreground"
                      >
                        삭제
                      </button>
                    </div>
                    );
                  })}
                </div>

                {totalPlayerPages > 1 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {Array.from({ length: totalPlayerPages }, (_, index) => {
                      const page = index + 1;

                      return (
                        <button
                          key={`player-page-${page}`}
                          type="button"
                          onClick={() => setPlayerListPage(page)}
                          className={
                            page === currentPlayerPage
                              ? "rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                              : "rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-foreground"
                          }
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                <div className="mt-4 grid grid-cols-[minmax(0,1fr)_96px] gap-3">
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(event) => setNewPlayerName(event.target.value)}
                    placeholder="예: 새 선수 이름"
                    className="h-11 rounded-2xl border border-line bg-white px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={handleAddPlayer}
                    className="rounded-2xl bg-primary px-4 text-sm font-semibold text-white"
                  >
                    선수 추가
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSaveTeams}
                    className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(19,60,115,0.22)]"
                  >
                    팀/선수 저장
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTeamDrafts(null);
                      setSelectedTeamId(state.teams[0]?.id ?? "");
                      setPlayerListPage(1);
                      setNewPlayerName("");
                    }}
                    className="rounded-full border border-line bg-card px-5 py-3 text-sm font-medium text-foreground"
                  >
                    초안 되돌리기
                  </button>
                  <span className="rounded-full bg-card px-3 py-2 text-xs font-semibold text-muted">
                    {hasTeamDraftChanges ? "저장 전 변경 있음" : "저장된 상태와 동일"}
                  </span>
                  <span className="rounded-full bg-card px-3 py-2 text-xs font-semibold text-muted">
                    {selectedTeam && usedTeamIds.has(selectedTeam.id)
                      ? "현재 선택 팀은 경기 사용 중"
                      : "현재 선택 팀은 삭제 가능"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-line bg-card p-5 shadow-[0_16px_40px_rgba(16,35,63,0.08)] sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              최근 저장 경기
            </h2>
            <p className="mt-1 text-sm text-muted">
              관리자 페이지에서 저장한 최근 입력 경기 목록입니다.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {recentAdminGames.length === 0 ? (
              <div className="rounded-3xl bg-soft p-4 text-sm text-muted md:col-span-2 2xl:col-span-3">
                아직 관리자 입력으로 추가된 경기가 없습니다.
              </div>
            ) : (
              recentAdminGames.map((game) => (
                <article
                  key={game.id}
                  className="rounded-3xl border border-line bg-soft p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-muted">
                        {game.date} {game.time}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {game.awayTeam} vs {game.homeTeam}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted">{game.status}</p>
                      <p className="mt-1 text-sm font-semibold text-primary">
                        {game.awayScore ?? "-"} : {game.homeScore ?? "-"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted">{game.stadium}</p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

    </div>
  );
}

function cloneTeams(teams: TeamConfig[]) {
  return teams.map((team) => ({
    ...team,
    players: [...team.players],
  }));
}

function cloneGames(games: StoredGame[]) {
  return games.map((game) => ({
    ...game,
  }));
}

function validateTeams(teams: TeamConfig[]) {
  const normalizedNames = new Set<string>();

  for (const team of teams) {
    const trimmedTeamName = team.name.trim();
    if (!trimmedTeamName) {
      return "팀 이름은 비워둘 수 없습니다.";
    }

    if (normalizedNames.has(trimmedTeamName)) {
      return "팀 이름은 서로 겹칠 수 없습니다.";
    }
    normalizedNames.add(trimmedTeamName);

    for (const player of team.players) {
      if (!player.trim()) {
        return `${trimmedTeamName} 선수 명단에 빈 이름이 있습니다.`;
      }
    }
  }

  return null;
}

function validateGames(games: StoredGame[], teams: TeamConfig[]) {
  const teamIds = new Set(teams.map((team) => team.id));

  for (const game of games) {
    if (!teamIds.has(game.homeTeamId) || !teamIds.has(game.awayTeamId)) {
      return "존재하지 않는 팀이 경기 초안에 포함되어 있습니다.";
    }

    if (game.homeTeamId === game.awayTeamId) {
      return "홈팀과 원정팀은 같을 수 없습니다.";
    }

    if (!game.date || !game.time) {
      return "모든 경기의 날짜와 시간을 입력해 주세요.";
    }

    if (!game.stadium.trim()) {
      return "모든 경기의 장소를 입력해 주세요.";
    }

    if (game.status === "종료") {
      if (game.homeScore === null || game.awayScore === null) {
        return "종료된 경기는 점수를 모두 입력해야 합니다.";
      }
    }
  }

  return null;
}

function createNextTeamName(teams: TeamConfig[]) {
  const existingNames = new Set(teams.map((team) => team.name));
  let index = teams.length + 1;

  while (existingNames.has(`새 팀 ${index}`)) {
    index += 1;
  }

  return `새 팀 ${index}`;
}

function createNewGameDraft(teams: TeamConfig[]): StoredGame {
  const awayTeamId = teams[0]?.id ?? "";
  const homeTeamId = teams[1]?.id ?? teams[0]?.id ?? "";

  return {
    id: `admin-${Date.now()}`,
    date: "2025.04.23",
    time: "18:30",
    stadium: "대운동장 A",
    status: "예정",
    awayTeamId,
    homeTeamId,
    awayScore: null,
    homeScore: null,
    note: "관리자 입력으로 추가된 예정 경기",
    source: "admin",
    detailAvailable: false,
    createdAt: new Date().toISOString(),
  };
}

function toDateTimeLocalValue(game: StoredGame) {
  return `${game.date.replaceAll(".", "-")}T${game.time}`;
}

function parseDateTimeLocalValue(value: string) {
  const [datePart = "2025-04-23", timePart = "18:30"] = value.split("T");
  return {
    date: datePart.replaceAll("-", "."),
    time: timePart,
  };
}

function markGameAsEdited(game: StoredGame): StoredGame {
  if (game.detailAvailable) {
    return {
      ...game,
      detailAvailable: false,
    };
  }

  return game;
}

function displayTeamName(teamId: string, teamNameMap: Map<string, string>) {
  return teamNameMap.get(teamId) ?? teamId;
}
