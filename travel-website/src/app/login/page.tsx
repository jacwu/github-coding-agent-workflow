import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { sanitizeCallbackUrl } from "@/lib/auth-utils";
import LoginForm from "@/components/LoginForm";

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  const params = await searchParams;
  const callbackUrl =
    typeof params.callbackUrl === "string" ? params.callbackUrl : undefined;

  if (session?.user) {
    redirect(sanitizeCallbackUrl(callbackUrl));
  }

  return <LoginForm callbackUrl={callbackUrl} />;
}
