"use client";

import { useMemo, useState } from "react";
import { SectionCard } from "@/components/section-card";
import { useBaseballData } from "@/store/baseball-context";

export function TeamsPageClient() {
  const { state, rosterPlayers, displayHitters, displayPitchers } = useBaseballData();
  const [selectedTeamId, setSelectedTeamId] = useState(state.teams[0]?.id ?? "");

  const selectedTeam = useMemo(
    () => state.teams.find((team) => team.id === selectedTeamId) ?? state.teams[0] ?? null,
    [selectedTeamId, state.teams],
  );

  const selectedTeamPlayers = useMemo(() => {
    if (!selectedTeam) {
      return [];
    }

    const uploadedByName = new Map(
      rosterPlayers
        .filter((player) => player.teamId === selectedTeam.id)
        .map((player) => [player.name, player]),
    );

    return selectedTeam.players.map((playerName) => {
      const matchedUpload = uploadedByName.get(playerName);

      return {
        name: playerName,
        school: matchedUpload?.school || "출신고 정보 없음",
      };
    });
  }, [rosterPlayers, selectedTeam]);

  const selectedTeamHitters = useMemo(
    () =>
      selectedTeam
        ? displayHitters
            .filter((player) => player.teamId === selectedTeam.id)
            .sort((left, right) => left.player.localeCompare(right.player, "ko"))
        : [],
    [displayHitters, selectedTeam],
  );

  const selectedTeamPitchers = useMemo(
    () =>
      selectedTeam
        ? displayPitchers
            .filter((player) => player.teamId === selectedTeam.id)
            .sort((left, right) => left.player.localeCompare(right.player, "ko"))
        : [],
    [displayPitchers, selectedTeam],
  );

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#153e2e_0%,#2f7457_56%,#71b48d_100%)] px-5 py-6 text-white shadow-[0_20px_50px_rgba(21,62,46,0.22)] sm:px-8 sm:py-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-white/75">팀별 선수 / 기록 조회</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              팀을 선택하면 선수 명단과
              <br className="hidden sm:block" />타자·투수 기록을 한 번에 확인합니다.
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/80 sm:text-base">
              현재 저장된 공통 상태와 기록 집계 데이터를 그대로 사용합니다.
            </p>
          </div>

          <div className="w-full max-w-sm rounded-[28px] bg-white/10 p-4 backdrop-blur">
            <p className="text-xs font-semibold text-white/70">팀 선택</p>
            <select
              value={selectedTeam?.id ?? ""}
              onChange={(event) => setSelectedTeamId(event.target.value)}
              className="mt-3 w-full rounded-2xl border border-white/20 bg-white/12 px-4 py-3 text-sm text-white"
            >
              {state.teams.map((team) => (
                <option key={team.id} value={team.id} className="bg-white text-foreground">
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <SectionCard
        title="팀 선택"
        subtitle="현재 등록된 팀 중 하나를 선택해 상세 정보를 확인합니다."
      >
        <div className="flex flex-wrap gap-2">
          {state.teams.map((team) => {
            const isActive = team.id === selectedTeam?.id;

            return (
              <button
                key={team.id}
                type="button"
                onClick={() => setSelectedTeamId(team.id)}
                className={
                  isActive
                    ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(19,60,115,0.22)]"
                    : "rounded-full border border-line bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
                }
              >
                {team.name}
              </button>
            );
          })}
        </div>
      </SectionCard>

      {selectedTeam ? (
        <>
          <SectionCard
            title={selectedTeam.name}
            subtitle="선수 명단과 출신고등학교 정보를 확인할 수 있습니다."
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {selectedTeamPlayers.length === 0 ? (
                <div className="rounded-3xl bg-soft p-4 text-sm text-muted md:col-span-2 xl:col-span-3">
                  등록된 선수 정보가 없습니다.
                </div>
              ) : (
                selectedTeamPlayers.map((player) => (
                  <article
                    key={`${selectedTeam.id}-${player.name}`}
                    className="rounded-3xl border border-line bg-card p-4"
                  >
                    <p className="text-sm font-semibold text-foreground">{player.name}</p>
                    <p className="mt-1 text-sm text-muted">{player.school}</p>
                  </article>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="타자 기록"
            subtitle="현재 시스템에서 집계 가능한 타자 기록만 표시합니다."
          >
            <div className="overflow-x-auto">
              <div className="min-w-[920px] overflow-hidden rounded-2xl border border-line">
                <div className="grid grid-cols-[140px_90px_90px_90px_90px_90px_80px_80px_80px] bg-soft px-4 py-3 text-xs font-semibold text-muted">
                  <span>선수명</span>
                  <span className="text-right">타율</span>
                  <span className="text-right">출루율</span>
                  <span className="text-right">장타율</span>
                  <span className="text-right">OPS</span>
                  <span className="text-right">안타</span>
                  <span className="text-right">홈런</span>
                  <span className="text-right">타점</span>
                  <span className="text-right">도루</span>
                </div>
                <div className="divide-y divide-line bg-card">
                  {selectedTeamHitters.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-muted">기록 없음</div>
                  ) : (
                    selectedTeamHitters.map((player) => (
                      <div
                        key={player.id}
                        className="grid grid-cols-[140px_90px_90px_90px_90px_90px_80px_80px_80px] items-center px-4 py-3 text-sm"
                      >
                        <span className="font-semibold text-foreground">{player.player}</span>
                        <span className="text-right font-semibold text-primary">{player.avg}</span>
                        <span className="text-right">{player.obp}</span>
                        <span className="text-right">{player.slg}</span>
                        <span className="text-right">{player.ops}</span>
                        <span className="text-right">{player.hits}</span>
                        <span className="text-right">{player.hr}</span>
                        <span className="text-right">{player.rbi}</span>
                        <span className="text-right">{player.steals}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="투수 기록"
            subtitle="현재 시스템에서 집계 가능한 투수 기록만 표시합니다."
          >
            <div className="overflow-x-auto">
              <div className="min-w-[820px] overflow-hidden rounded-2xl border border-line">
                <div className="grid grid-cols-[140px_90px_90px_90px_90px_70px_70px_70px] bg-soft px-4 py-3 text-xs font-semibold text-muted">
                  <span>선수명</span>
                  <span className="text-right">ERA</span>
                  <span className="text-right">WHIP</span>
                  <span className="text-right">이닝</span>
                  <span className="text-right">탈삼진</span>
                  <span className="text-right">승</span>
                  <span className="text-right">패</span>
                  <span className="text-right">세이브</span>
                </div>
                <div className="divide-y divide-line bg-card">
                  {selectedTeamPitchers.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-muted">기록 없음</div>
                  ) : (
                    selectedTeamPitchers.map((player) => (
                      <div
                        key={player.id}
                        className="grid grid-cols-[140px_90px_90px_90px_90px_70px_70px_70px] items-center px-4 py-3 text-sm"
                      >
                        <span className="font-semibold text-foreground">{player.player}</span>
                        <span className="text-right font-semibold text-primary">{player.era}</span>
                        <span className="text-right">{player.whip}</span>
                        <span className="text-right">{player.ip}</span>
                        <span className="text-right">{player.so}</span>
                        <span className="text-right">{player.wins}</span>
                        <span className="text-right">{player.losses}</span>
                        <span className="text-right">{player.saves}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </SectionCard>
        </>
      ) : (
        <SectionCard title="팀 페이지" subtitle="표시할 팀이 없습니다.">
          <div className="rounded-3xl bg-soft p-5 text-sm text-muted">
            등록된 팀 데이터가 없습니다.
          </div>
        </SectionCard>
      )}
    </main>
  );
}
