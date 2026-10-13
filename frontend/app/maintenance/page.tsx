// Reached only via middleware.ts's rewrite while maintenance mode is on -- never linked to directly,
// so there's no nav/header here on purpose (nothing else on the site is browsable right now anyway).
export default async function MaintenancePage({
  searchParams
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-paper px-6 text-center">
      <span className="font-heading text-xs font-bold uppercase tracking-[0.3em] text-ink/40">
        Graphites
      </span>
      <h1 className="mt-6 font-heading text-3xl font-semibold uppercase tracking-wide text-ink sm:text-4xl">
        Back shortly
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-ink/60">
        {message || "We're currently performing some maintenance on the store. We'll be back online shortly -- thanks for your patience."}
      </p>
    </div>
  );
}
