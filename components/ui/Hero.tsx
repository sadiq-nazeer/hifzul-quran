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
      className={`rounded-3xl border border-foreground/10 bg-surface-raised/80 px-8 py-10 header-glow backdrop-blur ${className}`}
    >
      <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-foreground-muted">
        {description}
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
