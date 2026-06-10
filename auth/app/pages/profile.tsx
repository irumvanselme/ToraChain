import { Html } from "@elysia/html";

import type { EUserType } from "app/types.ts";
import { Layout } from "./layout.tsx";
import { profileScript } from "./script.ts";

export function Profile({ userType }: { userType: EUserType }) {
  const base = `/${userType}/api`;
  return (
    <Layout userType={userType} heading="Your profile">
      <div id="profile" class="profile" hidden>
        <div class="field">
          <span class="field-label">Name</span>
          <span class="field-value" data-field="name">
            —
          </span>
        </div>
        <div class="field">
          <span class="field-label">Email</span>
          <span class="field-value" data-field="email">
            —
          </span>
        </div>
        <div class="field">
          <span class="field-label">Email verified</span>
          <span class="field-value" data-field="emailVerified">
            —
          </span>
        </div>
        <div class="field">
          <span class="field-label">Member since</span>
          <span class="field-value" data-field="createdAt">
            —
          </span>
        </div>
        <button type="button" id="signout">
          Sign out
        </button>
      </div>
      <p class="message" id="profile-message">
        Loading…
      </p>
      <nav class="links">
        <a href={`/${userType}/login`}>Back to sign in</a>
      </nav>
      <script>
        {profileScript({
          sessionEndpoint: `${base}/get-session`,
          signOutEndpoint: `${base}/sign-out`,
          loginRedirect: `/${userType}/login`,
        })}
      </script>
    </Layout>
  );
}
