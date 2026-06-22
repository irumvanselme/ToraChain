export enum EUserType {
  VOTERS = "voters",
  ADMINS = "admins",
  AUDITORS = "auditors",
}

export const USER_TYPE_PREFIX: Record<EUserType, string> = {
  [EUserType.VOTERS]: "voter",
  [EUserType.ADMINS]: "admin",
  [EUserType.AUDITORS]: "auditor",
};

/** Table names for a domain's better-auth schema, e.g. `voter_users`. */
export interface AuthTableNames {
  user: string;
  session: string;
  account: string;
  verification: string;
  jwks: string;
}

export function tableNames(userType: EUserType): AuthTableNames {
  const prefix = USER_TYPE_PREFIX[userType];

  return {
    user: `${prefix}_users`,
    session: `${prefix}_sessions`,
    account: `${prefix}_accounts`,
    verification: `${prefix}_verifications`,
    jwks: `${prefix}_jwks`,
  };
}
