export interface DevBannerConfig {
  readonly ribbonLabel: string;
  readonly tooltipHeading: string;
  readonly tooltipBody: string;
  readonly ribbonColor: string;
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
