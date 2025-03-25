/**
 * Logger Utility
 * 
 * Provides consistent logging functionality across the application
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private logs: LogEntry[] = [];

  private constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private addLog(level: LogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };

    this.logs.push(entry);
    this.logToConsole(entry);
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
    return levels.indexOf(level) <= levels.indexOf(this.logLevel);
  }

  private logToConsole(entry: LogEntry): void {
    const style = this.getConsoleStyle(entry.level);
    console.log(
      `%c${entry.timestamp} [${entry.level.toUpperCase()}] ${entry.message}`,
      style
    );
    if (entry.data) {
      console.log(entry.data);
    }
  }

  private getConsoleStyle(level: LogLevel): string {
    switch (level) {
      case 'error':
        return 'color: red; font-weight: bold;';
      case 'warn':
        return 'color: orange; font-weight: bold;';
      case 'info':
        return 'color: blue;';
      case 'debug':
        return 'color: gray;';
      default:
        return '';
    }
  }

  public error(message: string, data?: unknown): void {
    this.addLog('error', message, data);
  }

  public warn(message: string, data?: unknown): void {
    this.addLog('warn', message, data);
  }

  public info(message: string, data?: unknown): void {
    this.addLog('info', message, data);
  }

  public debug(message: string, data?: unknown): void {
    this.addLog('debug', message, data);
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
}

export default Logger.getInstance(); 