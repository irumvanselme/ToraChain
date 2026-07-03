import { t } from "elysia";

import { EUserType } from "../types.ts";

export const UserTypeParam = t.Object({
  userType: t.Enum(EUserType),
});

export const ListUsersQuery = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  q: t.Optional(t.String()),
});

export const CreateAdminBody = t.Object({
  name: t.String({ minLength: 1 }),
  email: t.String({ format: "email" }),
  password: t.String({ minLength: 8 }),
});

export const DomainUserSchema = t.Object({
  id: t.String(),
  name: t.String(),
  email: t.String(),
  emailVerified: t.Boolean(),
  image: t.Nullable(t.String()),
  role: t.Nullable(t.String()),
  banned: t.Boolean(),
  createdAt: t.String(),
  updatedAt: t.String(),
});

export const UserListSchema = t.Object({
  data: t.Array(DomainUserSchema),
  pagination: t.Object({
    page: t.Number(),
    limit: t.Number(),
    total: t.Number(),
    totalPages: t.Number(),
  }),
});

export const ErrorSchema = t.Object({
  code: t.String(),
  message: t.String(),
});
