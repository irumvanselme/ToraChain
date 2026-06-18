import { Html } from "@elysia/html";

import type { EUserType } from "app/types.ts";
import { Layout } from "./layout.tsx";
import { devLoginScript, formScript } from "./script.ts";

export function Login({
  userType,
  redirectTo,
  devLogin,
}: {
  userType: EUserType;
  redirectTo?: string;
  /** When set (dev only), renders a one-click "Default login" button. */
  devLogin?: { email: string; password: string };
}) {
  const base = `/${userType}/api`;
  const target = redirectTo ?? `/${userType}/profile`;
  return (
    <Layout userType={userType} heading="Sign in">
      {devLogin && (
        <>
          <button
            type="button"
            id="dev-login"
            class="dev-login"
            title={`Sign in as ${devLogin.email}`}
          >
            ⚡ Default login (dev)
          </button>
          <script>
            {devLoginScript({
              formId: "login-form",
              buttonId: "dev-login",
              email: devLogin.email,
              password: devLogin.password,
            })}
          </script>
        </>
      )}
      <form id="login-form">
        <label>
          Email
          <input type="email" name="email" autocomplete="email" required />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            autocomplete="current-password"
            required
          />
        </label>
        <button type="submit">Sign in</button>
        <p class="message"></p>
      </form>
      <nav class="links">
        <a href={`/${userType}/register`}>Create account</a>
        <a href={`/${userType}/reset-password`}>Forgot password?</a>
      </nav>
      <script>
        {formScript({
          formId: "login-form",
          endpoint: `${base}/sign-in/email`,
          successMessage: "Signed in. Redirecting…",
          redirectTo: target,
        })}
      </script>
    </Layout>
  );
}
