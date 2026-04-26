import { AdminPlayerUploadSection } from "@/components/admin-player-upload-section";
import { AdminGameForm } from "@/components/admin-game-form";

export default function AdminPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#133c73_0%,#24579f_58%,#4f8fe2_100%)] px-5 py-6 text-white shadow-[0_20px_50px_rgba(19,60,115,0.24)] sm:px-8 sm:py-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-white/75">
              관리자 입력 페이지
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              경기 기본 정보를
              <br className="hidden sm:block" />입력하는 관리자 폼입니다.
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/80 sm:text-base">
              팀, 경기, 선수 명단, 경기 기록을 공용 저장소와 연결해 입력하고
              저장하는 관리자 화면입니다.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-[28px] bg-white/10 p-3 backdrop-blur sm:min-w-[320px]">
            <div className="rounded-2xl bg-white/12 p-4">
              <p className="text-xs text-white/70">입력 항목</p>
              <strong className="mt-2 block text-2xl">6+</strong>
            </div>
            <div className="rounded-2xl bg-white/12 p-4">
              <p className="text-xs text-white/70">저장 방식</p>
              <strong className="mt-2 block text-2xl">Shared DB</strong>
            </div>
            <div className="rounded-2xl bg-white/12 p-4">
              <p className="text-xs text-white/70">API 준비</p>
              <strong className="mt-2 block text-2xl">Ready</strong>
            </div>
          </div>
        </div>
      </section>

      <AdminGameForm />
      <AdminPlayerUploadSection />
    </main>
  );
}
