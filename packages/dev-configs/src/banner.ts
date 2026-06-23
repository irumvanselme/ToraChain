/**
 * Configuration for the development-preview banner shown on every ToraChain
 * frontend. Kept framework-agnostic (no React) so the Bun backends could
 * consume it too if they ever need to render the same copy.
 */
export interface DevBannerConfig {
  /** Short ribbon label — keep ≤ 5 chars so it fits the diagonal strip. */
  readonly ribbonLabel: string;

  /** Bold heading in the hover tooltip. */
  readonly tooltipHeading: string;

  /** Body copy in the hover tooltip. */
  readonly tooltipBody: string;

  /** Ribbon background color (any CSS color). */
  readonly ribbonColor: string;

  /** Ribbon text / tooltip accent color (any CSS color). */
  readonly ribbonTextColor: string;
}

export const DEV_BANNER: DevBannerConfig = {
  ribbonLabel: "DEV",
  tooltipHeading: "Under Development",
  tooltipBody:
    "Do not submit sensitive or personal information. This app is a work in progress and may go down without notice.",
  ribbonColor: "#f59e0b",
  ribbonTextColor: "#1c1917",
};
