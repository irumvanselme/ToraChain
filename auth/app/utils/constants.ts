import { status } from "elysia";
export const ok = () => status(200, { ok: true });
