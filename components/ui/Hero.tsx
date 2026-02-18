import { Button } from "./Button";

type HeroProps = {
  title: string;
  description: string;
  showHifzButton?: boolean;
  primaryAction?: {
    label: string;
    href: string;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
  className?: string;
};

export function Hero({
  title,
  description,
  showHifzButton = true,
  primaryAction,
  secondaryAction,
  className = "",
}: HeroProps) {
  return (
    <header
      className={`islamic-hero header-glow rounded-3xl border border-foreground/10 bg-surface-raised/80 px-8 py-10 backdrop-blur ${className}`}
    >
      <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-foreground-muted">
        {description}
      </p>
      <p className="mt-2 max-w-2xl text-base text-foreground-muted">
        <em>
          As our first release, we&apos;re excited to introduce these core
          features to support your Quran journey, rooted in a deep love for
          Islam and the words of Allah. Insha Allah, many more capabilities and
          rich content are on the way. For now, our primary focus is helping you
          recite and memorize the Quran effectively.
        </em>
      </p>
      {(showHifzButton || primaryAction || secondaryAction) && (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
          {showHifzButton && (
            <Button
              href="/hifz"
              variant="outline"
              size="md"
              className="flex w-full items-center justify-center sm:w-auto"
            >
              Start Memorizing
            </Button>
          )}
          {primaryAction && (
            <Button
              href={primaryAction.href}
              variant="outline"
              size="md"
              className="flex w-full items-center justify-center sm:w-auto"
            >
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              href={secondaryAction.href}
              variant="outline"
              size="md"
              className="flex w-full items-center justify-center sm:w-auto"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </header>
  );
}
