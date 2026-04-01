import Link from "next/link";

import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function Navbar() {
  const session = await auth();

  return (
    <nav className="glass sticky top-0 z-50">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-primary"
        >
          Travel Website
        </Link>

        <div className="flex items-center gap-2">
          {session?.user ? (
            <>
              <span className="text-sm text-foreground">
                {session.user.name ?? session.user.email}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <Button variant="ghost" size="sm" type="submit">
                  Logout
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg px-2.5 text-sm font-medium text-foreground hover:bg-muted h-7"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground h-7"
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
