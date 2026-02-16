import Link from "next/link";

const pillars = [
  {
    title: "Interactive Coach",
    description:
      "Adaptive listen → whisper → recite loops with audio tooling and feedback.",
    cta: "Enter Coach",
    href: "/coach",
  },
  {
    title: "Deep Study (Next)",
    description:
      "Trace tafsir, translations, and linguistic layers after each successful recitation.",
    cta: "Preview Brief",
    href: "/vision",
  },
  {
    title: "Narrative Journey (Later)",
    description:
      "Progress through thematic arcs like Hijrah or Mercy, visualized as immersive journeys.",
    cta: "See Roadmap",
    href: "/vision#narrative",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 py-16 lg:px-12">
      <header className="rounded-3xl border border-white/10 bg-surface-raised/80 px-8 py-10 header-glow backdrop-blur">
        <p className="text-sm uppercase tracking-[0.3em] text-foreground-muted">
          Quran.Foundation Candidate Project
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
          hifzul
          </h1>
        <p className="mt-4 max-w-2xl text-lg text-foreground-muted">
          Crafted to highlight sustainable engineering, immersive UX, and
          rigorous documentation. Iteration 1 delivers the Interactive
          Memorization & Recitation Coach while preparing study and narrative
          extensions.
          </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/coach"
            className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
          >
            Launch Coach
          </Link>
          <Link
            href="/docs/product/vision"
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand"
          >
            Read Vision Brief
          </Link>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        {pillars.map((pillar) => (
          <article
            key={pillar.title}
            className="flex flex-col justify-between rounded-2xl border border-white/10 bg-surface-muted/70 p-6"
          >
            <div>
              <h3 className="text-xl font-semibold text-foreground">
                {pillar.title}
              </h3>
              <p className="mt-3 text-sm text-foreground-muted">
                {pillar.description}
              </p>
            </div>
            <Link
              href={pillar.href}
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-accent"
            >
              {pillar.cta}
              <span aria-hidden="true">↗</span>
            </Link>
          </article>
        ))}
      </section>
      </main>
  );
}
