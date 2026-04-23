import Link from "next/link";
import { SectionCard } from "@/components/section-card";

type GameListCard = {
  id: string;
  date: string;
  time: string;
  stadium: string;
  status: "예정" | "종료" | "진행중";
  awayTeam: string;
  homeTeam: string;
  awayScore: number | null;
  homeScore: number | null;
  note: string;
  source: "mock" | "admin";
  detailAvailable: boolean;
};

type GamesPageClientProps = {
  recentGames: GameListCard[];
  upcomingGames: GameListCard[];
};

export function GamesPageClient({
  recentGames,
  upcomingGames,
}: Readonly<GamesPageClientProps>) {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <SectionCard
        title="최근 경기"
        subtitle="종료된 경기 결과를 확인합니다. mock 경기만 상세 페이지가 연결됩니다."
      >
        <div className="space-y-3">
          {recentGames.map((game) => (
            <GameListItem key={game.id} game={game} />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="예정 경기"
        subtitle="다가오는 경기 일정과 장소를 확인합니다."
      >
        <div className="space-y-3">
          {upcomingGames.map((game) => (
            <GameListItem key={game.id} game={game} />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function GameListItem({ game }: Readonly<{ game: GameListCard }>) {
  const content = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted">
          <span>{game.date}</span>
          <span className="h-1 w-1 rounded-full bg-line" />
          <span>{game.time}</span>
          <span className="h-1 w-1 rounded-full bg-line" />
          <span>{game.stadium}</span>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            game.status === "종료"
              ? "bg-card text-accent"
              : "bg-soft text-primary"
          }`}
        >
          {game.status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div>
          <p className="text-xs text-muted">원정</p>
          <p className="text-lg font-bold text-foreground">{game.awayTeam}</p>
        </div>
        <div className="text-center">
          {game.status === "종료" ? (
            <p className="text-xl font-bold text-primary">
              {game.awayScore} : {game.homeScore}
            </p>
          ) : (
            <p className="text-sm font-semibold text-accent">{game.stadium}</p>
          )}
          <p className="mt-1 text-xs font-semibold text-muted">
            {game.detailAvailable ? "상세 보기" : "입력 경기"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">홈</p>
          <p className="text-lg font-bold text-foreground">{game.homeTeam}</p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-muted">{game.note}</p>
    </>
  );

  if (game.detailAvailable) {
    return (
      <Link
        href={`/games/${game.id}`}
        className={`block rounded-[28px] border border-line p-4 transition-transform hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(16,35,63,0.1)] ${
          game.status === "종료" ? "bg-soft" : "bg-card"
        }`}
      >
        {content}
      </Link>
    );
  }

  return (
    <article
      className={`rounded-[28px] border border-line p-4 ${
        game.status === "종료" ? "bg-soft" : "bg-card"
      }`}
    >
      {content}
    </article>
  );
}
