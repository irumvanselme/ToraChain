import { EUserType } from "../app/types.ts";
import { main } from "./create-user.ts";

/**
 * Bootstraps an admins-domain account directly against the configured
 * database. Admin self-registration is disabled, so the *first* admin must be
 * created with this script; further admins are then created from the admin
 * frontend (Users → Add admin).
 *
 * Thin wrapper over `create-user.ts` with the user type pinned to `admins`;
 * see that file for the accepted flags and environment variables.
 */
await main({ defaultUserType: EUserType.ADMINS, invokedAs: "create-admin" });
