/**
 * Generate the inline client script that wires an auth form to a better-auth
 * endpoint. The form submits as JSON via fetch (credentials included so the
 * session cookie is set), then reports success/error in the `.message` slot.
 */
export function formScript(opts: {
  formId: string;
  endpoint: string;
  successMessage: string;
  redirectTo?: string;
}): string {
  const { formId, endpoint, successMessage, redirectTo } = opts;
  return `
(() => {
  const form = document.getElementById(${JSON.stringify(formId)});
  const msg = form.querySelector(".message");
  const button = form.querySelector("button");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.className = "message";
    msg.textContent = "";
    button.disabled = true;
    button.classList.add("loading");
    const body = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch(${JSON.stringify(endpoint)}, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || "Request failed (" + res.status + ")");
      }
      msg.className = "message success";
      msg.textContent = ${JSON.stringify(successMessage)};
      ${redirectTo ? `setTimeout(() => { window.location.href = ${JSON.stringify(redirectTo)}; }, 600);` : ""}
    } catch (err) {
      msg.className = "message error";
      msg.textContent = err.message;
    } finally {
      button.disabled = false;
      button.classList.remove("loading");
    }
  });
})();
`;
}

/**
 * Generate the inline client script for the dev "Default login" button. On
 * click it fills the form's email/password fields with the known dev
 * credentials and submits, so developers don't have to remember them. Only
 * emitted in non-production environments.
 */
export function devLoginScript(opts: {
  formId: string;
  buttonId: string;
  email: string;
  password: string;
}): string {
  const { formId, buttonId, email, password } = opts;
  return `
(() => {
  const form = document.getElementById(${JSON.stringify(formId)});
  const button = document.getElementById(${JSON.stringify(buttonId)});
  if (!form || !button) return;
  button.addEventListener("click", () => {
    const email = form.querySelector('[name="email"]');
    const password = form.querySelector('[name="password"]');
    if (email) email.value = ${JSON.stringify(email)};
    if (password) password.value = ${JSON.stringify(password)};
    form.requestSubmit();
  });
})();
`;
}

/**
 * Generate the inline client script for the profile page. Loads the current
 * session from better-auth (credentials included), fills in the profile
 * fields, and wires the sign-out button. Redirects to login when there is no
 * active session.
 */
export function profileScript(opts: {
  sessionEndpoint: string;
  signOutEndpoint: string;
  loginRedirect: string;
}): string {
  const { sessionEndpoint, signOutEndpoint, loginRedirect } = opts;
  return `
(() => {
  const root = document.getElementById("profile");
  const msg = document.getElementById("profile-message");
  const signout = document.getElementById("signout");

  const setMsg = (text, kind) => {
    msg.className = "message" + (kind ? " " + kind : "");
    msg.textContent = text || "";
  };
  const setField = (name, value) => {
    const el = root.querySelector('[data-field="' + name + '"]');
    if (el) el.textContent = value;
  };

  const load = async () => {
    try {
      const res = await fetch(${JSON.stringify(sessionEndpoint)}, {
        credentials: "include",
        headers: { accept: "application/json" },
      });
      const data = await res.json().catch(() => null);
      const user = data && data.user;
      if (!res.ok || !user) {
        setMsg("You're not signed in. Redirecting…", "error");
        setTimeout(() => { window.location.href = ${JSON.stringify(loginRedirect)}; }, 800);
        return;
      }
      setField("name", user.name || "—");
      setField("email", user.email || "—");
      setField("emailVerified", user.emailVerified ? "Yes" : "No");
      setField("createdAt", user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—");
      setMsg("");
      root.hidden = false;
    } catch (err) {
      setMsg(err.message || "Could not load profile.", "error");
    }
  };

  signout.addEventListener("click", async () => {
    signout.disabled = true;
    signout.classList.add("loading");
    setMsg("");
    try {
      const res = await fetch(${JSON.stringify(signOutEndpoint)}, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      if (!res.ok) throw new Error("Sign out failed (" + res.status + ")");
      setMsg("Signed out. Redirecting…", "success");
      setTimeout(() => { window.location.href = ${JSON.stringify(loginRedirect)}; }, 600);
    } catch (err) {
      setMsg(err.message, "error");
      signout.disabled = false;
      signout.classList.remove("loading");
    }
  });

  load();
})();
`;
}
