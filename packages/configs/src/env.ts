const ENVIRONMENTS = ["development", "demo"] as const;

export type Environment = (typeof ENVIRONMENTS)[number];

export function getEnv(): Environment {
  let localEnv: string | undefined;
  // @ts-ignore
  if (import.meta.env) {
    // @ts-ignore
    localEnv = import.meta.env.VITE_NODE_ENV || import.meta.env.NODE_ENV;
  } else {
    // @ts-ignore
    localEnv = process.env.NODE_ENV;
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
