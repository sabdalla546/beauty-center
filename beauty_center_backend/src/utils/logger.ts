// src/utils/logger.ts
import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const { combine, timestamp, printf, colorize, errors, json } = format;

// Human-friendly log format for console in dev
const devFormat = combine(
  colorize(),
  timestamp(),
  errors({ stack: true }), // <-- include stack trace
  printf(({ timestamp, level, message, stack, ...meta }) => {
    // if error stack exists, print it
    const base = `${timestamp} ${level}: ${message}`;
    if (stack)
      return `${base}\n${stack}\n${
        Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""
      }`;
    if (Object.keys(meta).length)
      return `${base}\n${JSON.stringify(meta, null, 2)}`;
    return base;
  })
);

// JSON format for files (structured)
const fileFormat = combine(timestamp(), errors({ stack: true }), json());

const LOG_LEVEL =
  process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");

// create transports
const consoleTransport = new transports.Console({
  level: LOG_LEVEL,
  format: devFormat,
});

// daily rotate file transport — keeps logs manageable
const rotateTransport = new DailyRotateFile({
  level: "info",
  filename: "logs/application-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",
  format: fileFormat,
});

// error file transport
const errorTransport = new DailyRotateFile({
  level: "error",
  filename: "logs/error-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "30d",
  format: fileFormat,
});

export const logger = createLogger({
  level: LOG_LEVEL,
  transports: [consoleTransport, rotateTransport, errorTransport],
  exitOnError: false,
});

// convenience wrappers
export function logInfo(msg: string, meta?: any) {
  logger.info(msg, meta);
}
export function logWarn(msg: string, meta?: any) {
  logger.warn(msg, meta);
}
export function logError(msg: string | Error, meta?: any) {
  if (msg instanceof Error) {
    logger.error(msg.message, { stack: msg.stack, ...meta });
  } else {
    logger.error(msg, meta);
  }
}
