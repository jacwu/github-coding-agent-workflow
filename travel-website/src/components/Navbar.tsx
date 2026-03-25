import Link from "next/link";
import { Plane, LogOut, User } from "lucide-react";

import { auth, signOut } from "@/lib/auth";

export default async function Navbar() {
  const session = await auth();
  const displayName = session?.user?.name ?? session?.user?.email ?? "Account";

  return (
    <nav className="glass sticky top-0 z-50 w-full">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold text-primary"
          >
            <Plane className="h-5 w-5" />
            <span>TravelSite</span>
          </Link>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/destinations"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Destinations
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              About
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {session?.user ? (
            <>
              <Link
                href="/trips"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                My Trips
              </Link>
              <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                <User className="h-4 w-4" />
                {displayName}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
