import { Html, type PropsWithChildren } from "@elysia/html";

import type { EUserType } from "app/types";
import { DEV_BANNER_CSS, CSS, FONT_STYLES } from "./_styles";
import {
  LOGO_MARK_SVG,
  LOGO_WORDMARK_SVG,
  LOGO_FAVICON_DATA_URI,
} from "./_logos";

const TITLES: Record<EUserType, string> = {
  voters: "Voter",
  admins: "Admin",
  auditors: "Auditor",
};

export function domainTitle(userType: EUserType): string {
  return TITLES[userType];
}

export type LayoutProps = PropsWithChildren<{
  userType: EUserType;
  heading: string;
}>;

/** Shared chrome + styling for every auth page. */
export function Layout({ userType, heading, children }: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title safe>{`ToraChain · ${domainTitle(userType)} ${heading}`}</title>
        <link rel="icon" type="image/svg+xml" href={LOGO_FAVICON_DATA_URI} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap"
          rel="stylesheet"
        />
        <style>{FONT_STYLES}</style>
        <style>{CSS}</style>
        <style>{DEV_BANNER_CSS}</style>
      </head>
      <body>
        <div class="dev-banner">
          <div class="dev-banner-corner">
            <span
              class="dev-banner-ribbon"
              aria-label="Under Development — do not submit sensitive information"
            >
              DEV
            </span>
          </div>
          <div class="dev-banner-tooltip" role="tooltip">
            <strong>Under Development</strong>
            Do not submit sensitive or personal information. This app is a work
            in progress and may go down without notice.
          </div>
        </div>
        <main class="card">
          <header class="brand">
            <span class="brand-lockup" aria-label="ToraChain">
              <span class="logo-mark">{LOGO_MARK_SVG}</span>
              <span class="logo-wordmark">{LOGO_WORDMARK_SVG}</span>
            </span>
            <span class="domain" safe>
              {domainTitle(userType)} portal
            </span>
          </header>
          <h1 safe>{heading}</h1>
          {children}
        </main>
      </body>
    </html>
  );
}
