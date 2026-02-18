import { cookies } from "next/headers";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { safeGetSession, decodeIdTokenClaims } from "@/lib/auth/session";

export async function Header() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const session = safeGetSession(cookieHeader || null);
  const claims = session ? decodeIdTokenClaims(session.idToken) : null;
  const displayName = claims?.name ?? claims?.email ?? null;

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-foreground/10 bg-background/80 backdrop-blur-md"
      role="banner"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
        <div className="flex min-w-0 items-center gap-6">
          <Link
            href="/"
            className="text-lg font-semibold text-foreground no-underline transition hover:text-brand sm:text-xl"
          >
            HifzDeen
          </Link>
          <nav className="hidden items-center gap-4 sm:flex">
            <Link
              href="/recite"
              className="text-sm text-foreground/80 underline-offset-4 transition hover:text-brand hover:underline"
            >
              Recite Quran 
            </Link>
            <Link
              href="/listening"
              className="text-sm text-foreground/80 underline-offset-4 transition hover:text-brand hover:underline"
            >
              Listen Quran
            </Link>
            <Link
              href="/hifz"
              className="text-sm text-foreground/80 underline-offset-4 transition hover:text-brand hover:underline"
            >
              Memorize Quran
            </Link>
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {session ? (
            <>
              <Link
                href="/collections"
                className="text-sm text-foreground/80 underline-offset-4 hover:underline"
              >
                Collections
              </Link>
              {displayName && (
                <span className="hidden max-w-[8rem] truncate text-sm text-muted-foreground sm:max-w-[12rem]">
                  {displayName}
                </span>
              )}
              <Link
                href="/api/auth/logout"
                className="text-sm text-foreground/80 underline-offset-4 hover:underline"
              >
                Sign out
              </Link>
            </>
          ) : (
            <Link
              href="/api/auth/login"
              className="text-sm text-foreground/80 underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          )}
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
