const ENVIRONMENTS = ["development", "demo"] as const;

export type Environment = (typeof ENVIRONMENTS)[number];

interface ImportMetaEnv {
  readonly NODE_ENV: string;
  readonly VITE_NODE_ENV: string;
}

export function getEnv(): Environment {
  let localEnv: string | undefined;
  const importMetaObj = import.meta as object;
  if (importMetaObj && "env" in importMetaObj && importMetaObj.env) {
    const importMetaEnv = importMetaObj.env as ImportMetaEnv;
    localEnv = importMetaEnv.VITE_NODE_ENV || importMetaEnv.NODE_ENV;
  } else {
    localEnv = process ? process.env.NODE_ENV : undefined;
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
