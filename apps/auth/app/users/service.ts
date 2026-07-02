import type { User, Where } from "better-auth";

import type { App } from "../_apps.ts";
import type { EUserType } from "../types.ts";
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

// ---- Service interface (so the router can be tested with fakes) ----------

export interface DomainUsersApi {
  list(userType: EUserType, input: ListUsersInput): Promise<UserListPage>;
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
}
