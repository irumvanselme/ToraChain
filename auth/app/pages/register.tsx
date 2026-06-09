import { Html } from "@elysia/html";

import type { EUserType } from "app/types.ts";
import { Layout } from "./layout.tsx";
import { formScript } from "./script.ts";

export function Register({ userType }: { userType: EUserType }) {
  const base = `/${userType}/api`;
  return (
    <Layout userType={userType} heading="Create account">
      <form id="register-form">
        <label>
          Name
          <input type="text" name="name" autocomplete="name" required />
        </label>
        <label>
          Email
          <input type="email" name="email" autocomplete="email" required />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            autocomplete="new-password"
            minlength="8"
            required
          />
        </label>
        <button type="submit">Create account</button>
      </form>
      <nav class="links">
        <a href={`/${userType}/login`}>Have an account? Sign in</a>
      </nav>
      <script>
        {formScript({
          formId: "register-form",
          endpoint: `${base}/sign-up/email`,
          successMessage: "Account created. Redirecting to sign in…",
          redirectTo: `/${userType}/login`,
        })}
      </script>
    </Layout>
  );
}
