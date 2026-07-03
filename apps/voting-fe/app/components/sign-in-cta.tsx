"use client";

import { Button } from "@tora-chain/ui-components";
import { ArrowRight } from "lucide-react";
import { useVoterEntry } from "./use-voter-entry";

interface SignInCtaProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Auth-aware primary call to action used in the hero and closing band. Sends
 * signed-out visitors to sign in and signed-in voters straight to elections.
 */
export function SignInCta({ size = "lg", className }: SignInCtaProps) {
  const { user, loading, enter } = useVoterEntry();

  return (
    <Button size={size} className={className} onClick={enter} loading={loading}>
      {user ? "View elections" : "Sign in to vote"}
      <ArrowRight className="size-4" />
    </Button>
  );
}
