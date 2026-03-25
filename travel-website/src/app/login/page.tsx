import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import LoginForm from "@/components/auth/LoginForm";

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session) {
    redirect("/");
  }

  const params = await searchParams;

  const rawCallback = typeof params.callbackUrl === "string" ? params.callbackUrl : undefined;

  let callbackUrl: string | undefined;
  if (rawCallback && rawCallback.startsWith("/") && !rawCallback.startsWith("//") && !rawCallback.includes("://")) {
    callbackUrl = rawCallback;
  }

  const registered = params.registered === "1";

  return (
    <main className="flex flex-1 items-center justify-center bg-background px-6 py-24">
      <LoginForm callbackUrl={callbackUrl} registered={registered} />
    </main>
  );
}
