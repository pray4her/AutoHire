import { headers } from "next/headers";

import { auth } from "@/lib/account-auth/auth";

export async function getAccountSession() {
  return auth.api.getSession({ headers: await headers() });
}
