import { type ReactNode } from "react";

type SectionProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  headerClassName?: string;
};

export function Section({
  children,
  title,
  subtitle,
  className = "",
  headerClassName = "",
}: SectionProps) {
  return (
    <section className={`space-y-4 ${className}`}>
      {(title || subtitle) && (
        <header className={headerClassName}>
          {title && (
            <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
          )}
          {subtitle && (
            <p className="mt-2 text-sm text-foreground-muted">{subtitle}</p>
          )}
        </header>
      )}
      {children}
    </section>
  );
}
