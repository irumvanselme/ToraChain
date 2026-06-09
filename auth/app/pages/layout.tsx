import { Html, type PropsWithChildren } from "@elysia/html";

import type { EUserType } from "app/types.ts";

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

const FONT_STYLES = `
* {
    font-family: "DM Sans", sans-serif;
    font-optical-sizing: auto;
    font-style: normal;
  }
`;

/** Shared chrome + styling for every auth page. */
export function Layout({ userType, heading, children }: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title safe>{`ToraChain · ${domainTitle(userType)} ${heading}`}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap"
          rel="stylesheet"
        />
        <style>{FONT_STYLES}</style>
        <style>{CSS}</style>
      </head>
      <body>
        <main class="card">
          <header class="brand">
            <span class="logo">ToraChain</span>
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

const CSS = `
:root { color-scheme: light dark; --accent: #4f46e5; --border: #d1d5db; }
* { box-sizing: border-box; }
body {
  margin: 0; min-height: 100vh; display: grid; place-items: center;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  background: #f3f4f6; color: #111827; padding: 1.5rem;
}
.card {
  width: 100%; max-width: 380px; background: #fff;
  padding: 2rem;;
}
.brand { display: flex; flex-direction: column; gap: .15rem; margin-bottom: 1.25rem; }
.logo { font-weight: 700; letter-spacing: .02em; color: var(--accent); }
.domain { font-size: .8rem; color: #6b7280; text-transform: uppercase; letter-spacing: .08em; }
h1 { font-size: 1.4rem; margin: 0 0 1.25rem; }
form { display: flex; flex-direction: column; gap: .85rem; }
label { display: flex; flex-direction: column; gap: .3rem; font-size: .85rem; font-weight: 600; }
input {
  padding: .6rem .7rem; border: 1px solid var(--border);
  font-size: 1rem; background: #fff; color: inherit;
}
input:focus { outline: 2px solid var(--accent); outline-offset: 1px; border-color: var(--accent); }
button {
  margin-top: .4rem; padding: .65rem; border: 0;
  background: var(--accent); color: #fff; font-size: 1rem; font-weight: 600; cursor: pointer;
}
button:disabled { opacity: .6; cursor: progress; }
.message { margin-top: 1rem; font-size: .9rem; min-height: 1.2em; }
.message.error { color: #b91c1c; }
.message.success { color: #15803d; }
.links { margin-top: 1.25rem; display: flex; justify-content: space-between; font-size: .85rem; }
.links a { color: var(--accent); text-decoration: none; }
.links a:hover { text-decoration: underline; }
`;
