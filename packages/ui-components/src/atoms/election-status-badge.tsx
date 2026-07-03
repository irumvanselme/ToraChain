import { cn } from "../cn.ts";
import { Badge, type BadgeProps } from "./badge.tsx";

type Tone = NonNullable<BadgeProps["tone"]>;

/** DaisyUI tone for each known election status. */
const STATUS_TONE: Record<string, Tone> = {
  draft: "ghost",
  enrolling_voters: "info",
  scheduled: "warning",
  active: "success",
  ended: "neutral",
  archived: "neutral",
  paused: "error",
};

/**
 * Short labels that override the default underscore title-casing — chiefly to
 * keep the badge on a single line on election cards (`enrolling_voters` would
 * otherwise render as the two-line "Enrolling Voters").
 */
const STATUS_LABEL_OVERRIDES: Record<string, string> = {
  enrolling_voters: "Enrollment",
};

/** Human-readable label for an election status (handles underscores). */
export function electionStatusLabel(status: string): string {
  return (
    STATUS_LABEL_OVERRIDES[status] ??
    status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

export interface ElectionStatusBadgeProps extends Omit<
  BadgeProps,
  "tone" | "children"
> {
  /** Raw election status, e.g. `"enrolling_voters"`. */
  status: string;
}

/**
 * Status badge for an election: maps a raw status string to a consistent tone
 * and a short, single-line label. Shared across admin, voting and auditing UIs.
 */
export function ElectionStatusBadge({
  status,
  className,
  ...rest
}: ElectionStatusBadgeProps) {
  return (
    <Badge
      tone={STATUS_TONE[status] ?? "neutral"}
      className={cn("whitespace-nowrap", className)}
      {...rest}
    >
      {electionStatusLabel(status)}
    </Badge>
  );
}
