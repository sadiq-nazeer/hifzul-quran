import Link from "next/link";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export function Header() {
  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-md"
      role="banner"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
        <div className="flex min-w-0 items-center gap-6">
          <Link
            href="/"
            className="text-lg font-semibold text-foreground no-underline transition hover:text-brand sm:text-xl"
          >
            hifzul
          </Link>
          {/* Reserved for nav links, etc. */}
        </div>
        <div className="flex shrink-0 items-center">
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
