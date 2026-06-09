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
    }
  });
})();
`;
}
