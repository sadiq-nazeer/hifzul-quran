import Link from "next/link";

const roadmaps = [
  {
    title: "Interactive Coach",
    subtitle: "Iteration 1 (current)",
    bullets: [
      "Guided listen → whisper → recite loop with adaptive prompts",
      "Looping audio segments, tempo control, and reflection sparks",
      "Session journaling + spaced repetition scaffolding",
    ],
  },
  {
    title: "Deep Study Companion",
    subtitle: "Iteration 2",
    bullets: [
      "Bring tafsir, translations, and linguistic overlays into the flow",
      "Surface thematic cross references and scholar notes",
      "Capture reflections and sync with QuranReflect in the future",
    ],
  },
  {
    title: "Narrative Journey Mode",
    subtitle: "Iteration 3",
    bullets: [
      "Visualize progress as journeys (Hijrah, Mercy, Justice arcs)",
      "Unlock location-inspired ambience and audio cues",
      "Tie sustainability metrics to each journey to reinforce stewardship",
    ],
  },
];

export default function VisionPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-16">
      <Link
        href="/"
        className="text-sm text-foreground-muted transition hover:text-brand"
      >
        ← Back to overview
      </Link>
      <header className="space-y-4">
        <p className="text-xs uppercase tracking-[0.35em] text-foreground-muted">
          Vision Brief
        </p>
        <h1 className="text-4xl font-semibold text-foreground">
          hifzul
        </h1>
        <p className="text-lg text-foreground-muted">
          A multi-iteration initiative answering the Quran.Foundation Full-Stack
          Engineer brief by emphasizing sustainable improvements, delightful UX,
          and system-wide learning (
          <a
            className="text-brand hover:text-brand-accent"
            href="https://quran.foundation/careers/full-stack-engineer"
            target="_blank"
            rel="noreferrer"
          >
            source
          </a>
          ).
        </p>
      </header>

      <section className="space-y-6 rounded-3xl border border-white/10 bg-surface-raised/70 p-8">
        <h2 className="text-2xl font-semibold text-brand">Operating Tenets</h2>
        <ul className="list-disc space-y-3 pl-6 text-foreground-muted">
          <li>Enhance existing ecosystems before inventing new silos.</li>
          <li>Design for low-carbon delivery—cache, stream, and instrument.</li>
          <li>Document obsessively so the next steward can amplify impact.</li>
        </ul>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {roadmaps.map((stage) => (
          <article
            key={stage.title}
            id={stage.title === "Narrative Journey Mode" ? "narrative" : undefined}
            className="rounded-2xl border border-white/5 bg-surface-muted/70 p-6"
          >
            <p className="text-xs uppercase tracking-[0.35em] text-foreground-muted">
              {stage.subtitle}
            </p>
            <h3 className="mt-2 text-xl font-semibold">{stage.title}</h3>
            <ul className="mt-4 space-y-2 text-sm text-foreground-muted">
              {stage.bullets.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <p className="text-xs text-foreground-muted">
        Built for the Quran.Foundation Full-Stack Engineer applicant
        assessment.
      </p>
    </main>
  );
}

