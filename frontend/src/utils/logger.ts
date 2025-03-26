/**
 * Frontend Logger Utility
 * 
 * Provides a consistent logging interface for the frontend application
 * with support for different log levels and console output
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = 'info';
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  private constructor() {
    // Always use 'info' as the default log level for production
    this.logLevel = 'info';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
    return levels.indexOf(level) <= levels.indexOf(this.logLevel);
  }

  private addLog(level: LogLevel, message: string, data?: any) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output with appropriate styling
    const style = this.getConsoleStyle(level);
    console.log(
      `%c${entry.timestamp} [${level.toUpperCase()}] ${message}`,
      style,
      data || ''
    );
  }

  private getConsoleStyle(level: LogLevel): string {
    switch (level) {
      case 'error':
        return 'color: #ff0000; font-weight: bold;';
      case 'warn':
        return 'color: #ffa500; font-weight: bold;';
      case 'info':
        return 'color: #0000ff;';
      case 'debug':
        return 'color: #666666; font-style: italic;';
      default:
        return '';
    }
  }

  public error(message: string, data?: any) {
    this.addLog('error', message, data);
  }

  public warn(message: string, data?: any) {
    this.addLog('warn', message, data);
  }

  public info(message: string, data?: any) {
    this.addLog('info', message, data);
  }

  public debug(message: string, data?: any) {
    this.addLog('debug', message, data);
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
  }

  public setLogLevel(level: LogLevel) {
    if (['error', 'warn', 'info', 'debug'].includes(level)) {
      this.logLevel = level;
    }
  }
}

export default Logger.getInstance(); 