"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { UploadedPlayer } from "@/data/types";

export function PlayerRosterList({
  players,
  title,
  subtitle,
  onDeletePlayer,
  pagination,
}: Readonly<{
  players: UploadedPlayer[];
  title: string;
  subtitle: string;
  onDeletePlayer?: (player: UploadedPlayer) => void;
  pagination?: {
    enabled: boolean;
    itemsPerPage: number;
    showEdgeButtons?: boolean;
  };
}>) {
  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("전체");
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search);

  const teamOptions = useMemo(
    () =>
      Array.from(
        new Set(players.map((player) => player.teamName || "미지정")),
      ).sort(),
    [players],
  );

  const filteredPlayers = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    return players.filter((player) => {
      const matchesTeam =
        selectedTeam === "전체"
          ? true
          : (player.teamName || "미지정") === selectedTeam;
      const matchesSearch =
        normalizedSearch.length === 0
          ? true
          : player.name.toLowerCase().includes(normalizedSearch);

      return matchesTeam && matchesSearch;
    });
  }, [deferredSearch, players, selectedTeam]);

  const paginationEnabled = pagination?.enabled === true;
  const fallbackItemsPerPage = filteredPlayers.length || 1;
  const requestedItemsPerPage =
    pagination?.itemsPerPage ?? fallbackItemsPerPage;
  const itemsPerPage = Math.max(1, requestedItemsPerPage);
  const totalPages = paginationEnabled
    ? Math.max(1, Math.ceil(filteredPlayers.length / itemsPerPage))
    : 1;
  const currentPage = Math.min(page, totalPages);
  const pagedPlayers = paginationEnabled
    ? filteredPlayers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage,
      )
    : filteredPlayers;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[220px_180px]">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-muted">
              이름 검색
            </span>
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="선수 이름"
              className="h-11 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-muted">
              팀 필터
            </span>
            <select
              value={selectedTeam}
              onChange={(event) => {
                setSelectedTeam(event.target.value);
                setPage(1);
              }}
              className="h-11 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground outline-none transition-colors focus:border-primary"
            >
              <option value="전체">전체</option>
              {teamOptions.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {paginationEnabled ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-muted">
            총 {filteredPlayers.length}명 · {currentPage}/{totalPages} 페이지
          </p>
          <div className="flex flex-wrap gap-2">
            {pagination?.showEdgeButtons ? (
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={currentPage === 1}
                className="rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-foreground disabled:opacity-40"
              >
                맨 앞으로
              </button>
            ) : null}
            {Array.from({ length: totalPages }, (_, index) => {
              const nextPage = index + 1;

              return (
                <button
                  key={`roster-page-${nextPage}`}
                  type="button"
                  onClick={() => setPage(nextPage)}
                  className={
                    nextPage === currentPage
                      ? "rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                      : "rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-foreground"
                  }
                >
                  {nextPage}
                </button>
              );
            })}
            {pagination?.showEdgeButtons ? (
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={currentPage === totalPages}
                className="rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-foreground disabled:opacity-40"
              >
                맨 뒤로
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-line">
        <div className="grid grid-cols-[1fr_1fr_88px] bg-soft px-4 py-3 text-xs font-semibold text-muted">
          <span>이름</span>
          <span>출신고</span>
          <span>관리</span>
        </div>
        <div className="divide-y divide-line bg-card">
          {pagedPlayers.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted">
              표시할 선수가 없습니다.
            </div>
          ) : (
            pagedPlayers.map((player) => (
              <div
                key={player.id}
                className="grid grid-cols-[1fr_1fr_88px] items-center px-4 py-3 text-sm"
              >
                <span className="font-medium text-foreground">{player.name}</span>
                <span className="text-muted">{player.school}</span>
                <span>
                  {onDeletePlayer ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `${player.name} 선수를 삭제할까요? 이 작업은 되돌릴 수 없습니다.`,
                          )
                        ) {
                          onDeletePlayer(player);
                        }
                      }}
                      className="rounded-full bg-[#fff0f0] px-3 py-1.5 text-xs font-semibold text-[#b91c1c]"
                    >
                      삭제
                    </button>
                  ) : (
                    <span className="text-xs text-muted">-</span>
                  )}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
