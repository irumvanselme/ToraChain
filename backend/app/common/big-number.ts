import { numeric } from "drizzle-orm/pg-core";

// 216-bit server-generated identifier, stored as arbitrary-precision numeric.
export const pgBigNumber = (name: string) =>
  numeric(name, { precision: 78, scale: 0 }).notNull().unique();
