import { Html } from "@elysia/html";

import type { EUserType } from "app/types.ts";
import { Layout } from "./layout.tsx";

export function Pending({ userType }: { userType: EUserType }) {
  const base = `/${userType}/api`;
  const auditStatusEndpoint = `/auditors/audit/status`;
  const signOutEndpoint = `${base}/sign-out`;
  const loginUrl = `/${userType}/login`;

  return (
    <Layout userType={userType} heading="Pending approval">
      <div id="status-content">
        <p style="margin: 0 0 1rem; color: #6b7280;">Checking status…</p>
      </div>
      <nav class="links">
        <a href={`/${userType}/profile`}>Profile</a>
        <a href="#" id="signout-link">
          Sign out
        </a>
      </nav>
      <script>
        {`
(() => {
  const content = document.getElementById('status-content');
  const signoutLink = document.getElementById('signout-link');

  async function load() {
    try {
      const res = await fetch(${JSON.stringify(auditStatusEndpoint)}, {
        credentials: 'include',
        headers: { accept: 'application/json' },
      });
      if (res.status === 401) {
        window.location.href = ${JSON.stringify(loginUrl)};
        return;
      }
      const data = await res.json().catch(() => null);
      const org = data?.org;
      if (!org) {
        content.innerHTML = '<p style="color:#6b7280;">No organization found. <a href="/auditors/onboarding">Create one</a>.</p>';
        return;
      }
      const status = org.approvalStatus;
      if (status === 'approved') {
        content.innerHTML = '<p style="color:#15803d;">Your organization has been approved! You can now access audit features.</p>';
      } else if (status === 'rejected') {
        const reason = org.rejectionReason ? '<p style="color:#6b7280;margin-top:0.5rem;">Reason: ' + org.rejectionReason + '</p>' : '';
        content.innerHTML = '<p style="color:#b91c1c;font-weight:600;">Your organization was rejected.</p>' + reason + '<p style="margin-top:1rem;"><a href="/auditors/onboarding">Submit a new organization</a></p>';
      } else {
        content.innerHTML = '<div style="background:#fef9c3;border-left:3px solid #eab308;padding:1rem;margin-bottom:1rem;"><strong>Under review</strong><p style="margin:0.5rem 0 0;color:#6b7280;">Your organization <strong>' + org.name + '</strong> is pending admin approval. This may take a short while.</p></div>';
      }
    } catch (err) {
      content.innerHTML = '<p style="color:#b91c1c;">Could not load status: ' + err.message + '</p>';
    }
  }

  signoutLink.addEventListener('click', async (e) => {
    e.preventDefault();
    await fetch(${JSON.stringify(signOutEndpoint)}, {
      method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: '{}',
    }).catch(() => {});
    window.location.href = ${JSON.stringify(loginUrl)};
  });

  load();
})();
`}
      </script>
    </Layout>
  );
}
