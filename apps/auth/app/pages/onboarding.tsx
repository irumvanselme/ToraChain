import { Html } from "@elysia/html";

import type { EUserType } from "app/types.ts";
import { Layout } from "./layout.tsx";

export function Onboarding({ userType }: { userType: EUserType }) {
  const base = `/${userType}/api`;
  const orgEndpoint = `${base}/organization/create`;
  const sessionEndpoint = `${base}/get-session`;
  const loginUrl = `/${userType}/login`;

  return (
    <Layout userType={userType} heading="Set up your organization">
      <p style="margin: 0 0 1.5rem; color: #6b7280; font-size: 1rem;">
        Before you can access audit data, you need to register your
        organization. An admin will review and approve your request.
      </p>
      <form id="onboarding-form">
        <label>
          Organization name
          <input
            type="text"
            name="name"
            placeholder="e.g. National Electoral Commission"
            required
          />
        </label>
        <label>
          Slug{" "}
          <span style="font-weight:400; color:#6b7280;">
            (URL-friendly identifier)
          </span>
          <input
            type="text"
            name="slug"
            placeholder="e.g. national-electoral-commission"
            pattern="[a-z0-9-]+"
            title="Lowercase letters, numbers and hyphens only"
            required
          />
        </label>
        <button type="submit">Submit for approval</button>
        <p class="message"></p>
      </form>
      <nav class="links">
        <a href={`/${userType}/profile`}>Back to profile</a>
      </nav>
      <script>
        {`
(() => {
  const form = document.getElementById('onboarding-form');
  const msg = form.querySelector('.message');
  const button = form.querySelector('button');

  // If already has an org, redirect to pending page.
  fetch(${JSON.stringify(sessionEndpoint)}, { credentials: 'include', headers: { accept: 'application/json' } })
    .then(r => r.json()).catch(() => null)
    .then(data => {
      if (!data?.user) {
        window.location.href = ${JSON.stringify(loginUrl)};
      }
    });

  // Auto-fill slug from name.
  form.querySelector('[name="name"]').addEventListener('input', (e) => {
    const slug = form.querySelector('[name="slug"]');
    if (!slug._touched) {
      slug.value = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
  });
  form.querySelector('[name="slug"]').addEventListener('input', function() {
    this._touched = true;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.className = 'message';
    msg.textContent = '';
    button.disabled = true;
    button.classList.add('loading');
    const { name, slug } = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch(${JSON.stringify(orgEndpoint)}, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || 'Request failed (' + res.status + ')');
      msg.className = 'message success';
      msg.textContent = 'Organization submitted! Redirecting…';
      setTimeout(() => { window.location.href = '/auditors/pending'; }, 800);
    } catch (err) {
      msg.className = 'message error';
      msg.textContent = err.message;
    } finally {
      button.disabled = false;
      button.classList.remove('loading');
    }
  });
})();
`}
      </script>
    </Layout>
  );
}
