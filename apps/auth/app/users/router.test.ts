import { beforeEach, describe, expect, test } from "vitest";

import { UsersRouter, type UsersDeps } from "./_router.ts";
import { EUserType } from "../types.ts";
import { CoreHttpError } from "../core/errors.ts";
import type {
  CreateAdminInput,
  DomainUserDTO,
  DomainUsersApi,
  ListUsersInput,
  UserListPage,
} from "./service.ts";

function makeUser(userType: EUserType, i: number): DomainUserDTO {
  return {
    id: `${userType}-${i}`,
    name: `User ${i}`,
    email: `user-${i}@${userType}.example.com`,
    emailVerified: i % 2 === 0,
    image: null,
    role: null,
    banned: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

class FakeUsersApi implements DomainUsersApi {
  usersByType = new Map<EUserType, DomainUserDTO[]>();
  calls: Array<{ userType: EUserType; input: ListUsersInput }> = [];
  createCalls: CreateAdminInput[] = [];

  async createAdmin(input: CreateAdminInput): Promise<DomainUserDTO> {
    this.createCalls.push(input);
    const admins = this.usersByType.get(EUserType.ADMINS) ?? [];
    if (admins.some((u) => u.email === input.email)) {
      throw CoreHttpError.conflict(
        `An admin with email ${input.email} already exists.`,
      );
    }
    const user: DomainUserDTO = {
      ...makeUser(EUserType.ADMINS, admins.length),
      name: input.name,
      email: input.email,
    };
    this.usersByType.set(EUserType.ADMINS, [...admins, user]);
    return user;
  }

  async list(
    userType: EUserType,
    input: ListUsersInput,
  ): Promise<UserListPage> {
    this.calls.push({ userType, input });
    const all = (this.usersByType.get(userType) ?? []).filter(
      (u) => !input.q || u.email.includes(input.q),
    );
    const start = (input.page - 1) * input.limit;
    return {
      data: all.slice(start, start + input.limit),
      pagination: {
        page: input.page,
        limit: input.limit,
        total: all.length,
        totalPages: Math.max(1, Math.ceil(all.length / input.limit)),
      },
    };
  }
}

describe("UsersRouter", () => {
  let users: FakeUsersApi;
  let app: ReturnType<typeof UsersRouter>;

  const ADMIN = { "x-admin": "yes" };

  beforeEach(() => {
    users = new FakeUsersApi();
    const deps: UsersDeps = {
      users,
      async getAdminSession(headers) {
        return headers.get("x-admin") === "yes" ? { userId: "admin-1" } : null;
      },
    };
    app = UsersRouter(deps);
  });

  const call = async (
    path: string,
    headers: Record<string, string> = {},
  ): Promise<{ status: number; body: Record<string, unknown> }> => {
    const res = await app.handle(
      new Request(`http://localhost${path}`, { headers }),
    );
    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      /* keep raw text */
    }
    return { status: res.status, body: body as Record<string, unknown> };
  };

  test("rejects listing without an admin session", async () => {
    const res = await call("/core/api/users/voters");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });

  test("lists a domain's users with default pagination", async () => {
    users.usersByType.set(
      EUserType.VOTERS,
      Array.from({ length: 3 }, (_, i) => makeUser(EUserType.VOTERS, i)),
    );

    const res = await call("/core/api/users/voters", ADMIN);
    expect(res.status).toBe(200);
    expect((res.body.data as DomainUserDTO[]).length).toBe(3);
    expect(res.body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 3,
      totalPages: 1,
    });
    expect(users.calls).toEqual([
      {
        userType: EUserType.VOTERS,
        input: { page: 1, limit: 10, q: undefined },
      },
    ]);
  });

  test("passes page, limit, and q through to the service", async () => {
    users.usersByType.set(
      EUserType.AUDITORS,
      Array.from({ length: 12 }, (_, i) => makeUser(EUserType.AUDITORS, i)),
    );

    const res = await call("/core/api/users/auditors?page=2&limit=5", ADMIN);
    expect(res.status).toBe(200);
    expect((res.body.data as DomainUserDTO[]).length).toBe(5);
    expect(res.body.pagination).toEqual({
      page: 2,
      limit: 5,
      total: 12,
      totalPages: 3,
    });

    const search = await call("/core/api/users/auditors?q=user-1", ADMIN);
    expect(search.status).toBe(200);
    expect(
      (search.body.data as DomainUserDTO[]).map((u) => u.id),
    ).toStrictEqual(["auditors-1", "auditors-10", "auditors-11"]);
  });

  test("400 on an unknown user domain", async () => {
    const res = await call("/core/api/users/hackers", ADMIN);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION");
    expect(users.calls).toEqual([]);
  });

  test("400 on invalid pagination values", async () => {
    const res = await call("/core/api/users/admins?limit=1000", ADMIN);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION");
  });

  describe("create admin", () => {
    const post = async (
      body: unknown,
      headers: Record<string, string> = {},
    ): Promise<{ status: number; body: Record<string, unknown> }> => {
      const res = await app.handle(
        new Request("http://localhost/core/api/users/admins", {
          method: "POST",
          headers: { "content-type": "application/json", ...headers },
          body: JSON.stringify(body),
        }),
      );
      return {
        status: res.status,
        body: (await res.json()) as Record<string, unknown>,
      };
    };

    const INPUT = {
      name: "New Admin",
      email: "new-admin@example.com",
      password: "s3cret-pass",
    };

    test("rejects creation without an admin session", async () => {
      const res = await post(INPUT);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe("UNAUTHORIZED");
      expect(users.createCalls).toEqual([]);
    });

    test("creates an admin and returns 201", async () => {
      const res = await post(INPUT, ADMIN);
      expect(res.status).toBe(201);
      expect(res.body.name).toBe(INPUT.name);
      expect(res.body.email).toBe(INPUT.email);
      expect(users.createCalls).toEqual([INPUT]);
    });

    test("400 on an invalid email or short password", async () => {
      const badEmail = await post({ ...INPUT, email: "not-an-email" }, ADMIN);
      expect(badEmail.status).toBe(400);
      expect(badEmail.body.code).toBe("VALIDATION");

      const shortPassword = await post({ ...INPUT, password: "short" }, ADMIN);
      expect(shortPassword.status).toBe(400);
      expect(shortPassword.body.code).toBe("VALIDATION");
      expect(users.createCalls).toEqual([]);
    });

    test("409 when the email is already taken", async () => {
      const first = await post(INPUT, ADMIN);
      expect(first.status).toBe(201);

      const duplicate = await post(INPUT, ADMIN);
      expect(duplicate.status).toBe(409);
      expect(duplicate.body.code).toBe("CONFLICT");
    });
  });
});
