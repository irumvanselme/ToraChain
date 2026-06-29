import pino, {
  type Logger as PinoLogger,
  type LoggerOptions as PinoLoggerOptions,
} from "pino";

import { getEnv, getBoolEnv, isProduction } from "../config";

export type LogLevel =
  "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";

export type LogBindings = Record<string, unknown>;

export interface LoggerConfig {
  level?: LogLevel;
  name?: string;
  pretty?: boolean;
  bindings?: LogBindings;
}

export class Logger {
  private readonly logger: PinoLogger;

  constructor(config: LoggerConfig | PinoLogger = {}) {
    if (Logger.isPinoLogger(config)) {
      this.logger = config;
      return;
    }

    const {
      level = (getEnv("LOG_LEVEL") as LogLevel | undefined) ?? "info",
      name,
      pretty = getBoolEnv("LOG_PRETTY", !isProduction()),
      bindings,
    } = config;

    const options: PinoLoggerOptions = {
      level,
      base: { ...(name ? { name } : {}), ...(bindings ?? {}) },
    };

    if (pretty) {
      options.transport = {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      };
    }

    this.logger = pino(options);
  }

  private static isPinoLogger(value: unknown): value is PinoLogger {
    return (
      typeof value === "object" &&
      value !== null &&
      typeof (value as PinoLogger).child === "function" &&
      typeof (value as PinoLogger).info === "function"
    );
  }

  child(bindings: LogBindings): Logger {
    return new Logger(this.logger.child(bindings));
  }

  fatal(message: string, data?: LogBindings): void {
    this.logger.fatal(data ?? {}, message);
  }

  error(message: string, data?: LogBindings): void {
    this.logger.error(data ?? {}, message);
  }

  exception(exception: unknown): void {
    this.logger.error(exception);
  }

  warn(message: string, data?: LogBindings): void {
    this.logger.warn(data ?? {}, message);
  }

  info(message: string, data?: LogBindings): void {
    this.logger.info(data ?? {}, message);
  }

  debug(message: string, data?: LogBindings): void {
    this.logger.debug(data ?? {}, message);
  }

  trace(message: string, data?: LogBindings): void {
    this.logger.trace(data ?? {}, message);
  }

  get raw(): PinoLogger {
    return this.logger;
  }
}

export const logger = new Logger();
