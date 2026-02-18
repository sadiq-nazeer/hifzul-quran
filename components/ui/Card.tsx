import { type ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  variant?: "default" | "muted" | "raised" | "highlight";
};

const variantStyles = {
  default: "bg-surface-raised/80 border-foreground/10",
  muted: "bg-surface-muted/70 border-foreground/10",
  raised: "bg-surface-raised/80 border-foreground/10 shadow-xl shadow-brand/5",
  highlight: "bg-surface-highlight/50 border-brand/30",
};

export function Card({ children, className = "", variant = "default" }: CardProps) {
  return (
    <div
      className={`rounded-2xl border ${variantStyles[variant]} p-6 ${className}`}
    >
      {children}
    </div>
  );
}
