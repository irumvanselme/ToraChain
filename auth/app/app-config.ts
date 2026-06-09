import * as z from "zod/mini"

const EnvSchema = z.object({
    BETTER_AUTH_SECRET: z.string(),
    ADMINS_AUTH_DB_URI: z.string(),
    VOTERS_AUTH_DB_URI: z.string(),
    AUDITORS_AUTH_DB_URI: z.string(),
})


type TEnv = z.infer<typeof EnvSchema>

export class AppConfig {
    config: TEnv;

    constructor() {
        this.config = EnvSchema.parse(process.env);
    }

    get(key: keyof TEnv) {
        return this.config[key];
    }
}

export const appConfig = new AppConfig();
