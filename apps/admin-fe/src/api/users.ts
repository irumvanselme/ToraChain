import { CORE_API } from "lib/config";
import { request } from "api/request";
import type { OffsetEnvelope } from "api/elections";

export const USER_TYPES = ["voters", "admins", "auditors"] as const;
export type UserType = (typeof USER_TYPES)[number];

export interface DomainUser {
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

export interface ListUsersParams {
  page?: number;
  limit?: number;
  /** Filters by email (contains). */
  q?: string;
}

export function listUsers(
  userType: UserType,
  params: ListUsersParams = {},
  signal?: AbortSignal,
): Promise<OffsetEnvelope<DomainUser>> {
  return request<OffsetEnvelope<DomainUser>>(`${CORE_API}/users/${userType}`, {
    query: params as Record<string, string | number | boolean | undefined>,
    signal,
  });
}
