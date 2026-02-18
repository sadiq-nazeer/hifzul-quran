import { BookOpen, Headphones, GraduationCap, Sparkles } from "lucide-react";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { Hero } from "@/components/ui/Hero";
import { Section } from "@/components/ui/Section";

const features = [
  {
    title: "Hifz - Quran Memorization",
    description:
      "Adaptive listen → whisper → recite loops with audio tooling and feedback for effective memorization.",
    href: "/hifz",
    icon: <GraduationCap className="h-6 w-6" />,
    cta: "Start Hifz",
  },
  {
    title: "Quran Recite",
    description:
      "Read and recite the full surah with beautiful Arabic text. Customize text size and color for optimal reading experience.",
    href: "/recite",
    icon: <BookOpen className="h-6 w-6" />,
    cta: "Start Reciting",
  },
  {
    title: "Quran Listening",
    description:
      "Listen to beautiful recitations from renowned reciters. Play full surahs or specific verses with advanced audio controls.",
    href: "/listening",
    icon: <Headphones className="h-6 w-6" />,
    cta: "Start Listening",
  },
];

const upcomingFeatures = [
  {
    title: "Deep Study",
    description:
      "Trace tafsir, translations, and linguistic layers after each successful recitation.",
    href: "/vision",
    cta: "Preview Brief",
  },
  {
    title: "Narrative Journey",
    description:
      "Progress through thematic arcs like Hijrah or Mercy, visualized as immersive journeys.",
    href: "/vision#narrative",
    cta: "See Roadmap",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-16 px-6 py-16 lg:px-12">
      <Hero
        title="HifzDeen"
        description="An immersive platform for Quran memorization, recitation, and listening. Experience the Holy Quran with beautiful recitations, translations, and interactive learning tools."
        primaryAction={{
          label: "Start Reciting",
          href: "/recite",
        }}
        secondaryAction={{
          label: "Start Listening",
          href: "/listening",
        }}
      />

      <Section
        title="Explore Features"
        subtitle="Choose how you want to engage with the Quran"
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </Section>

      <Section
        title="Coming Soon"
        subtitle="Exciting features in development"
        className="border-t border-foreground/10 pt-12"
      >
        <div className="grid gap-6 md:grid-cols-2">
          {upcomingFeatures.map((feature) => (
            <FeatureCard
              key={feature.title}
              {...feature}
              icon={<Sparkles className="h-6 w-6" />}
            />
          ))}
        </div>
      </Section>
    </main>
  );
}
