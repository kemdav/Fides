export function PageLoading() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-powder px-4" aria-busy="true">
      <p className="font-display text-5xl leading-none text-burnt">Fides</p>
      <div role="status" className="flex items-center gap-3 text-base/6 font-semibold text-muted">
        <svg viewBox="0 0 24 24" aria-hidden fill="none" className="size-5 animate-spin text-burnt">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        Loading…
      </div>
    </main>
  );
}
