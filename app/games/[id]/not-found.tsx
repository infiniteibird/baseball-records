export default function GameNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-[32px] border border-line bg-card p-8 text-center shadow-[0_16px_40px_rgba(16,35,63,0.08)]">
        <p className="text-sm font-semibold text-accent">404</p>
        <h2 className="mt-2 text-2xl font-bold text-foreground">
          경기 정보를 찾을 수 없습니다
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          존재하지 않는 경기 ID이거나 mock data에 아직 등록되지 않은 경기입니다.
        </p>
      </section>
    </main>
  );
}
