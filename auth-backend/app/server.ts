import Elysia from "elysia";

new Elysia().get("/", () => "auth backend 3").listen(3000);
