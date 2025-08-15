import winston from "winston";
import path from "path";
import { app } from "electron";

export class Logger {
  private logger: winston.Logger;

  constructor() {
    const logDir = path.join(app.getPath("userData"), "logs");

    this.logger = winston.createLogger({
      level: process.env.NODE_ENV === "development" ? "debug" : "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: "ai-helpdesk" },
      transports: [
        // Write all logs to console in development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),

        // Write all logs to file
        new winston.transports.File({
          filename: path.join(logDir, "error.log"),
          level: "error",
          maxsize: 5 * 1024 * 1024, // 5MB
          maxFiles: 5,
        }),

        new winston.transports.File({
          filename: path.join(logDir, "combined.log"),
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
        }),
      ],
    });
  }

  public info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  public warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  public error(message: string, error?: any): void {
    this.logger.error(message, { error: error?.stack || error });
  }

  public debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  public verbose(message: string, meta?: any): void {
    this.logger.verbose(message, meta);
  }

  public http(message: string, meta?: any): void {
    this.logger.http(message, meta);
  }
}
