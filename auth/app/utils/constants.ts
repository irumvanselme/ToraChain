import { status } from "elysia";
export const okResponse = { ok: true };
export const ok = () => status(200, okResponse);
