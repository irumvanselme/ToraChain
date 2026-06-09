import { Html } from "@elysia/html";

import type { EUserType } from "app/types.ts";
import { config } from "../env.ts";
import { Layout } from "./layout.tsx";
import { formScript } from "./script.ts";

export function ResetPassword({ userType }: { userType: EUserType }) {
  const base = `/${userType}/api`;
  const redirectTo = `${config.baseURL}/${userType}/login`;
  return (
    <Layout userType={userType} heading="Reset password">
      <form id="reset-form">
        <label>
          Email
          <input type="email" name="email" autocomplete="email" required />
        </label>
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <button type="submit">Send reset link</button>
        <p class="message"></p>
      </form>
      <nav class="links">
        <a href={`/${userType}/login`}>Back to sign in</a>
      </nav>
      <script>
        {formScript({
          formId: "reset-form",
          endpoint: `${base}/request-password-reset`,
          successMessage: "If that email exists, a reset link is on its way.",
        })}
      </script>
    </Layout>
  );
}
