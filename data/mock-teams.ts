import type { TeamConfig } from "@/data/types";

export const seasonOptions = [
  "2026 킹고야구반배 교내야구대회",
  "2025 킹고야구반배 교내야구대회",
  "2024 가을 리그",
  "2024 봄 리그",
];

export const mockTeams: TeamConfig[] = [
  {
    id: "team-lg",
    name: "LG",
    players: ["홍창기", "오스틴", "문보경", "김현수", "박해민", "신민재"],
  },
  {
    id: "team-kia",
    name: "KIA",
    players: ["박찬호", "김도영", "최형우", "김선빈", "나성범", "소크라테스"],
  },
  {
    id: "team-samsung",
    name: "삼성",
    players: ["김성윤", "구자욱", "강민호", "오재일", "류지혁", "이재현"],
  },
  {
    id: "team-doosan",
    name: "두산",
    players: ["정수빈", "양석환", "강승호", "양의지", "허경민", "조수행"],
  },
  {
    id: "team-ssg",
    name: "SSG",
    players: ["최지훈", "에레디아", "최정", "한유섬", "박성한", "김성현"],
  },
  {
    id: "team-lotte",
    name: "롯데",
    players: ["황성빈", "윤동희", "전준우", "유강남", "정훈", "노진혁"],
  },
  {
    id: "team-kt",
    name: "KT",
    players: ["강백호", "김민혁", "장성우", "문상철", "배정대", "황재균"],
  },
  {
    id: "team-hanwha",
    name: "한화",
    players: ["문현빈", "노시환", "채은성", "이진영", "최재훈", "정은원"],
  },
  {
    id: "team-nc",
    name: "NC",
    players: ["손아섭", "박건우", "권희동", "김휘집", "서호철", "김주원"],
  },
  {
    id: "team-kiwoom",
    name: "키움",
    players: ["김혜성", "송성문", "이주형", "최주환", "임병욱", "이형종"],
  },
];
