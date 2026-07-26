import { describe, expect, test } from "vitest";
import { Html } from "@elysia/html";

import { EUserType } from "../types.ts";
import { AppRegistry, type App } from "../_apps.ts";
import { Layout, domainTitle } from "./layout.tsx";
import { Login } from "./login.tsx";
import { Register } from "./register.tsx";
import { ResetPassword } from "./reset-password.tsx";
import { Profile } from "./profile.tsx";
import { Onboarding } from "./onboarding.tsx";
import { Pending } from "./pending.tsx";
import { WebRouter } from "./router.ts";
import { formScript, devLoginScript, profileScript } from "./script.ts";

// Force the JSX factory import to be "used".
void Html;

const render = async (node: unknown): Promise<string> => String(await node);

describe("domainTitle", () => {
  test("maps each domain to its human title", () => {
    expect(domainTitle(EUserType.VOTERS)).toBe("Voter");
    expect(domainTitle(EUserType.ADMINS)).toBe("Admin");
    expect(domainTitle(EUserType.AUDITORS)).toBe("Auditor");
  });
});

describe("page components", () => {
  test("Layout renders chrome, title, and children", async () => {
    const html = await render(
      Layout({
        userType: EUserType.ADMINS,
        heading: "Sign in",
        children: "HELLO_CHILD",
      }),
    );
    expect(html).toContain("<html");
    expect(html).toContain("ToraChain · Admin Sign in");
    expect(html).toContain("Admin portal");
    expect(html).toContain("HELLO_CHILD");
  });

  test("Login renders the form and a dev-login button when credentials are given", async () => {
    const html = await render(
      Login({
        userType: EUserType.VOTERS,
        devLogin: { email: "dev@x.dev", password: "secret" },
      }),
    );
    expect(html).toContain('id="login-form"');
    expect(html).toContain('id="dev-login"');
    expect(html).toContain("/voters/api/sign-in/email");
    // Voters can self-register, so the register link appears.
    expect(html).toContain("/voters/register");
    // Terms are accepted at registration only — signing in must not re-ask.
    expect(html).not.toContain('id="accept-terms"');
    expect(html).not.toContain("/legal/terms-and-conditions");
    expect(html).not.toContain("/legal/privacy-policy");
  });

  test("Login without dev credentials omits the dev button and honors a redirect", async () => {
    const html = await render(
      Login({ userType: EUserType.ADMINS, redirectTo: "/dashboard" }),
    );
    expect(html).not.toContain('id="dev-login"');
    // Admins cannot self-register.
    expect(html).not.toContain("/admins/register");
    expect(html).toContain("/dashboard");
  });

  test("Register redirects auditors to onboarding and others to login", async () => {
    const auditor = await render(Register({ userType: EUserType.AUDITORS }));
    expect(auditor).toContain("/auditors/onboarding");
    expect(auditor).toContain("organization");

    const voter = await render(Register({ userType: EUserType.VOTERS }));
    expect(voter).toContain("/voters/login");
    // Registration is where the terms must be accepted.
    expect(voter).toContain('id="accept-terms"');
    expect(voter).toContain("/legal/terms-and-conditions");
    expect(voter).toContain("/legal/privacy-policy");
  });

  test("ResetPassword renders the request-reset form", async () => {
    const html = await render(ResetPassword({ userType: EUserType.VOTERS }));
    expect(html).toContain("/voters/api/request-password-reset");
    expect(html).toContain("Reset password");
  });

  test("Profile renders the profile shell and sign-out", async () => {
    const html = await render(Profile({ userType: EUserType.AUDITORS }));
    expect(html).toContain('id="profile"');
    expect(html).toContain('id="signout"');
    expect(html).toContain("/auditors/api/get-session");
  });

  test("Onboarding renders the org form", async () => {
    const html = await render(Onboarding({ userType: EUserType.AUDITORS }));
    expect(html).toContain('id="onboarding-form"');
    expect(html).toContain("/auditors/api/organization/create");
  });

  test("Pending renders the status shell", async () => {
    const html = await render(Pending({ userType: EUserType.AUDITORS }));
    expect(html).toContain('id="status-content"');
    expect(html).toContain("/auditors/audit/status");
  });
});

describe("client scripts", () => {
  test("formScript embeds endpoint and success message, and a redirect when set", () => {
    const withRedirect = formScript({
      formId: "f",
      endpoint: "/api/x",
      successMessage: "done",
      redirectTo: "/next",
    });
    expect(withRedirect).toContain('"/api/x"');
    expect(withRedirect).toContain('"done"');
    expect(withRedirect).toContain("window.location.href");

    const noRedirect = formScript({
      formId: "f",
      endpoint: "/api/x",
      successMessage: "done",
    });
    expect(noRedirect).not.toContain("window.location.href");
  });

  test("devLoginScript wires the button to fill credentials", () => {
    const script = devLoginScript({
      formId: "login-form",
      buttonId: "dev-login",
      email: "dev@x.dev",
      password: "pw",
    });
    expect(script).toContain('"dev-login"');
    expect(script).toContain('"dev@x.dev"');
    expect(script).toContain("requestSubmit");
  });

  test("profileScript wires session, sign-out, and login redirect", () => {
    const script = profileScript({
      sessionEndpoint: "/api/get-session",
      signOutEndpoint: "/api/sign-out",
      loginRedirect: "/login",
    });
    expect(script).toContain('"/api/get-session"');
    expect(script).toContain('"/api/sign-out"');
    expect(script).toContain('"/login"');
  });
});

describe("WebRouter", () => {
  function registry(): AppRegistry {
    const r = new AppRegistry();
    for (const userType of [
      EUserType.VOTERS,
      EUserType.ADMINS,
      EUserType.AUDITORS,
    ]) {
      r.registerApp({
        userType,
        dbPool: {} as App["dbPool"],
        auth: {} as App["auth"],
      });
    }
    return r;
  }

  const web = WebRouter(registry());
  const get = async (path: string) => {
    const res = await web.handle(new Request(`http://localhost${path}`));
    return { status: res.status, text: await res.text() };
  };

  test("GET / lists per-domain links", async () => {
    const res = await get("/");
    expect(res.status).toBe(200);
    const links = JSON.parse(res.text) as Record<string, { login: string }>;
    expect(links.voters?.login).toContain("/voters/login");
    expect(links.admins).not.toHaveProperty("register");
    expect(links.voters).toHaveProperty("register");
  });

  test("GET /{domain}/ok returns ok", async () => {
    const res = await get("/voters/ok");
    expect(res.status).toBe(200);
    expect(JSON.parse(res.text)).toStrictEqual({ ok: true });
  });

  test("GET /voters/login renders and drops an unsafe redirect", async () => {
    const res = await get("/voters/login?redirect=//evil.com");
    expect(res.status).toBe(200);
    expect(res.text).not.toContain("//evil.com");
  });

  test("GET /voters/login keeps a safe same-origin redirect", async () => {
    const res = await get("/voters/login?redirect=/elections");
    expect(res.text).toContain("/elections");
  });

  test("register is 404 for admins but renders for voters", async () => {
    expect((await get("/admins/register")).status).toBe(404);
    expect((await get("/voters/register")).status).toBe(200);
  });

  test("reset-password and profile render for a domain", async () => {
    expect((await get("/voters/reset-password")).status).toBe(200);
    expect((await get("/voters/profile")).status).toBe(200);
  });

  test("onboarding and pending are auditor-only", async () => {
    expect((await get("/auditors/onboarding")).status).toBe(200);
    expect((await get("/auditors/pending")).status).toBe(200);
    expect((await get("/voters/onboarding")).status).toBe(404);
    expect((await get("/voters/pending")).status).toBe(404);
  });
});
