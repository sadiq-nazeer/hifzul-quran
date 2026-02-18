import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";

type FeatureCardProps = {
  title: string;
  description: string;
  href: string;
  icon?: ReactNode;
  cta?: string;
  className?: string;
};

export function FeatureCard({
  title,
  description,
  href,
  icon,
  cta = "Learn more",
  className = "",
}: FeatureCardProps) {
  return (
    <article
      className={`islamic-card group flex flex-col justify-between rounded-2xl border border-foreground/10 bg-surface-muted/70 p-6 transition duration-200 hover:-translate-y-0.5 hover:border-brand/30 hover:bg-surface-muted/90 hover:shadow-lg hover:shadow-black/10 ${className}`}
    >
      <div>
        {icon && (
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brand shadow-sm">
            {icon}
          </div>
        )}
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-foreground-muted">
          {description}
        </p>
      </div>
      <Link
        href={href}
        className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-brand transition hover:text-brand-accent"
      >
        {cta}
        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </Link>
    </article>
  );
}
