export function SectionCard({
  title,
  subtitle,
  children,
}: Readonly<{
  title: string;
  subtitle: string;
  children: React.ReactNode;
}>) {
  return (
    <section className="rounded-[28px] border border-line bg-card p-5 shadow-[0_16px_40px_rgba(16,35,63,0.08)] sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>
        <span className="rounded-full bg-soft px-3 py-1 text-xs font-semibold text-primary">
          mock
        </span>
      </div>
      {children}
    </section>
  );
}
