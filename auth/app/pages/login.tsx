import { Html } from "@elysia/html";

import type { EUserType } from "app/types.ts";
import { Layout } from "./layout.tsx";
import { formScript } from "./script.ts";

export function Login({ userType }: { userType: EUserType }) {
  const base = `/${userType}/api`;
  return (
    <Layout userType={userType} heading="Sign in">
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
          redirectTo: `/${userType}/profile`,
        })}
      </script>
    </Layout>
  );
}
