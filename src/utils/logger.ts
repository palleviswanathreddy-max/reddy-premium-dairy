/**
 * Structured Logger
 * Provides enterprise-grade logging with levels and context
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

interface LogContext {
  userId?: string;
  endpoint?: string;
  method?: string;
  requestId?: string;
  duration?: number;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private minLevel: LogLevel = LogLevel.INFO;
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 1000;

  setMinLevel(level: LogLevel) {
    this.minLevel = level;
  }

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, message, context, error } = entry;
    let log = `[${timestamp}] ${level}: ${message}`;

    if (context && Object.keys(context).length > 0) {
      log += ` | ${JSON.stringify(context)}`;
    }

    if (error) {
      log += ` | Error: ${error.name} - ${error.message}`;
      if (this.isDevelopment && error.stack) {
        log += `\n${error.stack}`;
      }
    }

    return log;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      context,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      })
    };

    const formatted = this.formatLog(entry);

    // Console output
    if (level === LogLevel.ERROR || level === LogLevel.CRITICAL) {
      console.error(formatted);
    } else if (level === LogLevel.WARN) {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }

    // Buffer for later processing (e.g., sending to monitoring service)
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: LogContext) {
    this.log(LogLevel.ERROR, message, context, error);
  }

  critical(message: string, error?: Error, context?: LogContext) {
    this.log(LogLevel.CRITICAL, message, context, error);
  }

  getBuffer(): LogEntry[] {
    return [...this.logBuffer];
  }

  clearBuffer() {
    this.logBuffer = [];
  }
}

export const logger = new Logger();

/**
 * API Error Response Handler
 */
export class APIError extends Error {
  constructor(
    public statusCode: number = 500,
    message: string = 'Internal Server Error',
    public errorCode?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export function createErrorResponse(
  statusCode: number,
  message: string,
  errorCode?: string,
  additionalData?: any
) {
  return {
    success: false,
    error: {
      statusCode,
      message,
      errorCode: errorCode || `ERR_${statusCode}`,
      ...(additionalData && { data: additionalData })
    }
  };
}

export function handleAPIError(error: unknown, defaultMessage = 'An error occurred') {
  const isAPIError = error instanceof APIError;

  if (isAPIError) {
    logger.error(`API Error: ${error.message}`, error);
    return {
      statusCode: error.statusCode,
      response: createErrorResponse(error.statusCode, error.message, error.errorCode)
    };
  }

  if (error instanceof Error) {
    logger.error(`Unexpected Error: ${error.message}`, error);
    return {
      statusCode: 500,
      response: createErrorResponse(500, defaultMessage, 'INTERNAL_SERVER_ERROR')
    };
  }

  logger.error(`Unknown Error: ${JSON.stringify(error)}`);
  return {
    statusCode: 500,
    response: createErrorResponse(500, defaultMessage, 'INTERNAL_SERVER_ERROR')
  };
}
