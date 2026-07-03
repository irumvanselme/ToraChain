function css(strings: TemplateStringsArray, ...values: unknown[]) {
  return strings.reduce(
    (result, string, i) => result + string + (values[i] ?? ""),
    "",
  );
}

export const FONT_STYLES = css`
  * {
    font-family: "DM Sans", sans-serif;
    font-optical-sizing: auto;
    font-style: normal;
  }
`;

export const DEV_BANNER_CSS = css`
  /* Outer wrapper: fixed anchor, pointer-events disabled so it never blocks page content. */
  .dev-banner {
    position: fixed;
    top: 0;
    right: 0;
    pointer-events: none;
    z-index: 2147483001;
  }
  /* Clipping box for the diagonal ribbon. */
  .dev-banner-corner {
    position: absolute;
    top: 0;
    right: 0;
    width: 120px;
    height: 120px;
    overflow: hidden;
  }
  .dev-banner-ribbon {
    position: absolute;
    top: 26px;
    right: -32px;
    width: 140px;
    padding: 5px 0;
    background: #f59e0b;
    color: #1c1917;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    text-align: center;
    line-height: 1;
    transform: rotate(45deg);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
    cursor: default;
    pointer-events: auto;
    user-select: none;
  }
  .dev-banner-tooltip {
    display: none;
    position: fixed;
    top: 8px;
    right: 8px;
    max-width: 260px;
    background: #1c1917;
    color: #fef3c7;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.45;
    padding: 10px 14px;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
    border-left: 3px solid #f59e0b;
    pointer-events: none;
    z-index: 2147483001;
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
    white-space: normal;
  }
  .dev-banner-tooltip strong {
    display: block;
    margin-bottom: 4px;
    color: #fcd34d;
  }
  /* Show tooltip when ribbon is hovered. :has() is supported in all modern browsers. */
  .dev-banner:has(.dev-banner-ribbon:hover) .dev-banner-tooltip {
    display: block;
  }
`;

export const CSS = css`
  :root {
    color-scheme: light dark;
    /* ToraChain brand palette (see assets/logo-*.svg). */
    --brand-slate: #374a59;
    --brand-slate-dark: #2c3b47;
    --brand-sky: #84beef;
    --accent: var(--brand-slate);
    --border: #d1d5db;
  }
  * {
    box-sizing: border-box;
  }
  body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    font-family:
      system-ui,
      -apple-system,
      Segoe UI,
      Roboto,
      sans-serif;
    font-size: 1.0625rem;
    line-height: 1.5;
    background: #f3f4f6;
    color: #111827;
    padding: 2rem;
  }
  .card {
    width: 100%;
    max-width: 480px;
    background: #fff;
    padding: 3rem;
  }
  .brand {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    margin-bottom: 1.75rem;
  }
  .brand-lockup {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
  }
  /* The embedded SVGs carry fixed width/height attributes; CSS overrides them
     so the mark and wordmark scale together and share a baseline. */
  .logo-mark svg {
    display: block;
    height: 2.4rem;
    width: auto;
  }
  .logo-wordmark svg {
    display: block;
    height: 1.6rem;
    width: auto;
  }
  .domain {
    font-size: 0.9rem;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  h1 {
    font-size: 2rem;
    margin: 0 0 1.5rem;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    font-size: 1rem;
    font-weight: 600;
  }
  input {
    padding: 0.85rem 1rem;
    border: 1px solid var(--border);
    font-size: 1.125rem;
    background: #fff;
    color: inherit;
  }
  input:focus {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
    border-color: var(--accent);
  }
  button {
    position: relative;
    margin-top: 0.6rem;
    padding: 0.9rem;
    border: 0;
    background: var(--accent);
    color: #fff;
    font-size: 1.125rem;
    font-weight: 600;
    cursor: pointer;
  }
  button:hover:not(:disabled) {
    background: var(--brand-slate-dark);
  }
  button:disabled {
    opacity: 0.6;
    cursor: progress;
  }
  .dev-login {
    margin: 0 0 1.5rem;
    padding: 0.75rem;
    width: 100%;
    background: transparent;
    color: var(--accent);
    border: 1px dashed var(--accent);
    border-radius: 6px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
  }
  .dev-login:hover {
    background: rgba(79, 70, 229, 0.06);
  }
  button.loading {
    color: transparent;
    pointer-events: none;
  }
  button.loading::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: 1.1em;
    height: 1.1em;
    margin: -0.55em 0 0 -0.55em;
    border: 2px solid rgba(255, 255, 255, 0.45);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .message {
    margin-top: 1.25rem;
    font-size: 1rem;
  }
  .message:empty {
    display: none;
    margin: 0;
  }
  .message.error {
    color: #b91c1c;
  }
  .message.success {
    color: #15803d;
  }
  .links {
    margin-top: 1.75rem;
    display: flex;
    justify-content: space-between;
    font-size: 1rem;
  }
  .links a {
    color: var(--accent);
    text-decoration: none;
  }
  .links a:hover {
    text-decoration: underline;
  }
  .profile {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .field-label {
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #6b7280;
  }
  .field-value {
    font-size: 1.125rem;
    word-break: break-word;
  }
`;
