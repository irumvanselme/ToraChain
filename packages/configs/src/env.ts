const ENVIRONMENTS = ["development", "demo"] as const;

export type Environment = (typeof ENVIRONMENTS)[number];

export function getEnv(): Environment {
  let localEnv: string | undefined;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  if (import.meta.env) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    localEnv = import.meta.env.VITE_NODE_ENV || import.meta.env.NODE_ENV;
  } else {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
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
