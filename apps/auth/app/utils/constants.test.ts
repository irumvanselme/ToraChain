import { describe, test, expect } from "vitest";

import { links, ok, okResponse } from "./constants.ts";
import { config } from "../env.ts";
import { AppRegistry, type App } from "../_apps.ts";
import { EUserType } from "../types.ts";

function registry(...userTypes: EUserType[]): AppRegistry {
  const r = new AppRegistry();
  for (const userType of userTypes) {
    r.registerApp({
      userType,
      dbPool: {} as App["dbPool"],
      auth: {} as App["auth"],
    });
  }
  return r;
}

describe("constants", () => {
  describe("ok", () => {
    test("response should match snapshots", () => {
      expect(okResponse).toMatchSnapshot();
    });

    test("ok() returns a 200 status wrapping the ok response", () => {
      const res = ok();
      expect(res.code).toBe(200);
      expect(res.response).toStrictEqual(okResponse);
    });
  });

  describe("links", () => {
    test("builds the per-domain link map from the registry", () => {
      const result = links(registry(EUserType.VOTERS, EUserType.ADMINS))();
      expect(result.voters).toStrictEqual({
        login: `${config.baseURL}/voters/login`,
        register: `${config.baseURL}/voters/register`,
        resetPassword: `${config.baseURL}/voters/reset-password`,
        profile: `${config.baseURL}/voters/profile`,
        apiDocs: `${config.baseURL}/voters/api/reference`,
      });
    });

    test("omits the register link for domains that cannot self-register", () => {
      const result = links(registry(EUserType.ADMINS))();
      expect(result.admins).not.toHaveProperty("register");
      expect(result.admins?.login).toBe(`${config.baseURL}/admins/login`);
    });
  });
});
