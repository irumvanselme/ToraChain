"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@tora-chain/fe-common";
import { loginUrl } from "../lib/config.ts";

/**
 * Shared "get into the app" action for the public landing page. Signed-in
 * voters go straight to their elections; signed-out visitors are sent to the
 * voter sign-in page, which returns them to `/elections` afterwards. Exposes
 * `loading` so callers can hold the button until the session check resolves
 * (avoids sending an already-signed-in voter back through login on a fast tap).
 */
export function useVoterEntry() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const enter = () => {
    if (user) {
      router.push("/elections");
    } else {
      window.location.href = loginUrl(`${window.location.origin}/elections`);
    }
  };

  return { user, loading, enter };
}
