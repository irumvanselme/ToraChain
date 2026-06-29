const ENVIRONMENTS = ["development", "demo"] as const;

export type Environment = (typeof ENVIRONMENTS)[number];

export function getEnv(): Environment {
  const localEnv = process.env.NODE_ENV;
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
