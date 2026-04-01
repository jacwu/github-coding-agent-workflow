import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { sanitizeCallbackUrl } from "@/lib/auth-utils";
import RegisterForm from "@/components/RegisterForm";

interface RegisterPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const session = await auth();
  const params = await searchParams;
  const callbackUrl =
    typeof params.callbackUrl === "string" ? params.callbackUrl : undefined;

  if (session?.user) {
    redirect(sanitizeCallbackUrl(callbackUrl));
  }

  return <RegisterForm callbackUrl={callbackUrl} />;
}
