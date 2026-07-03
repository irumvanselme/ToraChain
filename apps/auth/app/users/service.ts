import type { User, Where } from "better-auth";
import { APIError } from "better-auth/api";

import type { App } from "../_apps.ts";
import { EUserType } from "../types.ts";
import { CoreHttpError } from "../core/errors.ts";

// ---- DTOs ----------------------------------------------------------------

export interface DomainUserDTO {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string | null;
  banned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OffsetPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UserListPage {
  data: DomainUserDTO[];
  pagination: OffsetPagination;
}

export interface ListUsersInput {
  page: number;
  limit: number;
  q?: string;
}

export interface CreateAdminInput {
  name: string;
  email: string;
  password: string;
}

// ---- Service interface (so the router can be tested with fakes) ----------

export interface DomainUsersApi {
  list(userType: EUserType, input: ListUsersInput): Promise<UserListPage>;
  createAdmin(input: CreateAdminInput): Promise<DomainUserDTO>;
}

/** Fields the better-auth admin plugin adds to the user model. */
type AdminUserFields = { role?: string | null; banned?: boolean | null };

function serializeUser(user: User & AdminUserFields): DomainUserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image ?? null,
    role: user.role ?? null,
    banned: user.banned ?? false,
    createdAt: new Date(user.createdAt).toISOString(),
    updatedAt: new Date(user.updatedAt).toISOString(),
  };
}

/**
 * Lists each identity domain's users through its better-auth instance.
 *
 * The admin plugin's `listUsers` endpoint only authorises sessions stored in
 * the *same* domain's tables, but ToraChain admins live in their own domain —
 * so the router verifies the admins session and this service performs the
 * same call that endpoint makes (`internalAdapter.listUsers`/`countTotalUsers`).
 */
export class DomainUsersService implements DomainUsersApi {
  constructor(private readonly apps: App[]) {}

  async list(
    userType: EUserType,
    input: ListUsersInput,
  ): Promise<UserListPage> {
    const app = this.apps.find((a) => a.userType === userType);
    if (!app) {
      throw CoreHttpError.notFound(`Unknown user domain: ${userType}.`);
    }

    const { page, limit, q } = input;
    const where: Where[] | undefined = q
      ? [{ field: "email", operator: "contains", value: q }]
      : undefined;

    const ctx = await app.auth.$context;
    const [users, total] = await Promise.all([
      ctx.internalAdapter.listUsers(
        limit,
        (page - 1) * limit,
        { field: "createdAt", direction: "desc" },
        where,
      ),
      ctx.internalAdapter.countTotalUsers(where),
    ]);

    return {
      data: users.map(serializeUser),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /**
   * Creates an admins-domain account. Public sign-up is disabled for admins,
   * so this goes through the admin plugin's `createUser` endpoint — invoked
   * server-side (no request headers) it skips the plugin's own session check,
   * and like `list` the router has already verified an admins session.
   */
  async createAdmin(input: CreateAdminInput): Promise<DomainUserDTO> {
    const app = this.apps.find((a) => a.userType === EUserType.ADMINS);
    if (!app) {
      throw CoreHttpError.notFound(`Unknown user domain: admins.`);
    }

    const email = input.email.toLowerCase();
    const ctx = await app.auth.$context;
    if (await ctx.internalAdapter.findUserByEmail(email)) {
      throw CoreHttpError.conflict(
        `An admin with email ${email} already exists.`,
      );
    }

    try {
      const { user } = await app.auth.api.createUser({
        body: { name: input.name, email, password: input.password },
      });
      return serializeUser(user);
    } catch (error) {
      if (error instanceof APIError) {
        throw CoreHttpError.badRequest(error.body?.message ?? error.message);
      }
      throw error;
    }
  }
}
