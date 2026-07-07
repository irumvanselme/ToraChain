const ENVIRONMENTS = ["development", "demo"] as const;

export type Environment = (typeof ENVIRONMENTS)[number];

export function getEnv(): Environment {
  let localEnv: string | undefined;
  // `import.meta.env` is populated by Vite bundlers but absent in plain
  // Node/Bun; read it through a cast so this stays runtime-agnostic.
  const meta = import.meta as unknown as {
    env?: Record<string, string | undefined>;
  };
  if (meta.env) {
    localEnv = meta.env.VITE_NODE_ENV || meta.env.NODE_ENV;
  } else {
    // `process` exists in Node/Bun but not in bundler type contexts; read it
    // through a cast so this stays runtime-agnostic.
    const proc = (
      globalThis as unknown as {
        process?: { env?: Record<string, string | undefined> };
      }
    ).process;
    localEnv = proc?.env?.NODE_ENV;
  }

  if (localEnv == "production") {
    localEnv = "demo";
  }

  if (localEnv == "test") {
    localEnv = "development";
  }

  if (!localEnv || !ENVIRONMENTS.includes(localEnv as Environment)) {
    throw new Error(
      `Invalid NODE_ENV ${localEnv}. Must be one of ${ENVIRONMENTS.join(", ")}`,
    );
  }

  return localEnv as Environment;
}

export const isDevelopment = () => getEnv() === "development";
export const isDemo = () => getEnv() === "demo";

export const getEnvironmentFullName = () => {
  const env = getEnv();
  return env[0]!.toUpperCase() + env.slice(1);
};
