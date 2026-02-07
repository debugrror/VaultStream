import { config } from '@config/env';

/**
 * Log levels
 */
export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

/**
 * Logger class for structured logging
 */
class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = config.env === 'development';
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  }

  error(message: string, error?: Error | any) {
    const meta = error instanceof Error 
      ? { message: error.message, stack: error.stack } 
      : error;
    console.error(this.formatMessage(LogLevel.ERROR, message, meta));
  }

  warn(message: string, meta?: any) {
    console.warn(this.formatMessage(LogLevel.WARN, message, meta));
  }

  info(message: string, meta?: any) {
    console.log(this.formatMessage(LogLevel.INFO, message, meta));
  }

  debug(message: string, meta?: any) {
    if (this.isDevelopment) {
      console.log(this.formatMessage(LogLevel.DEBUG, message, meta));
    }
  }

  http(method: string, url: string, statusCode: number, duration: number) {
    const message = `${method} ${url} ${statusCode} - ${duration}ms`;
    this.info(message);
  }
}

export const logger = new Logger();
