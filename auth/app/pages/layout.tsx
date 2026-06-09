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
  font-size: 1.0625rem; line-height: 1.5;
  background: #f3f4f6; color: #111827; padding: 2rem;
}
.card {
  width: 100%; max-width: 480px; background: #fff;
  padding: 3rem;
}
.brand { display: flex; flex-direction: column; gap: .25rem; margin-bottom: 1.75rem; }
.logo { font-size: 1.5rem; font-weight: 700; letter-spacing: .02em; color: var(--accent); }
.domain { font-size: .9rem; color: #6b7280; text-transform: uppercase; letter-spacing: .08em; }
h1 { font-size: 2rem; margin: 0 0 1.5rem; }
form { display: flex; flex-direction: column; gap: 1.1rem; }
label { display: flex; flex-direction: column; gap: .4rem; font-size: 1rem; font-weight: 600; }
input {
  padding: .85rem 1rem; border: 1px solid var(--border);
  font-size: 1.125rem; background: #fff; color: inherit;
}
input:focus { outline: 2px solid var(--accent); outline-offset: 1px; border-color: var(--accent); }
button {
  position: relative; margin-top: .6rem; padding: .9rem; border: 0;
  background: var(--accent); color: #fff; font-size: 1.125rem; font-weight: 600; cursor: pointer;
}
button:disabled { opacity: .6; cursor: progress; }
button.loading { color: transparent; pointer-events: none; }
button.loading::after {
  content: ""; position: absolute; top: 50%; left: 50%;
  width: 1.1em; height: 1.1em; margin: -0.55em 0 0 -0.55em;
  border: 2px solid rgba(255, 255, 255, .45); border-top-color: #fff;
  border-radius: 50%; animation: spin .6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.message { margin-top: 1.25rem; font-size: 1rem; }
.message:empty { display: none; margin: 0; }
.message.error { color: #b91c1c; }
.message.success { color: #15803d; }
.links { margin-top: 1.75rem; display: flex; justify-content: space-between; font-size: 1rem; }
.links a { color: var(--accent); text-decoration: none; }
.links a:hover { text-decoration: underline; }
.profile { display: flex; flex-direction: column; gap: 1rem; }
.field { display: flex; flex-direction: column; gap: .25rem; }
.field-label { font-size: .85rem; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: #6b7280; }
.field-value { font-size: 1.125rem; word-break: break-word; }
`;
