export type DevUserType = "voters" | "admins" | "auditors";

export interface DevCredential {
  readonly userType: DevUserType;
  readonly email: string;
  readonly name: string;
  readonly password: string;
}

export const DEV_PASSWORD = "Pa$$w0rd!";

export const DEV_CREDENTIALS: Record<DevUserType, DevCredential> = {
  admins: {
    userType: "admins",
    email: "admin@localhost.dev",
    name: "Admin User",
    password: DEV_PASSWORD,
  },
  voters: {
    userType: "voters",
    email: "voter@localhost.dev",
    name: "Voter User",
    password: DEV_PASSWORD,
  },
  auditors: {
    userType: "auditors",
    email: "auditor@localhost.dev",
    name: "Auditor User",
    password: DEV_PASSWORD,
  },
};

export const DEV_USERS: readonly DevCredential[] =
  Object.values(DEV_CREDENTIALS);

export function getDevCredential(userType: DevUserType): DevCredential {
  return DEV_CREDENTIALS[userType];
}
