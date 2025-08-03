/**
 * Centralized logging system with environment-based controls
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory = 'performance' | 'canvas' | 'analysis' | 'upload' | 'migration' | 'api' | 'general';

interface LogConfig {
  enabled: boolean;
  level: LogLevel;
  categories: Set<LogCategory>;
}

class Logger {
  private static config: LogConfig = {
    enabled: import.meta.env.DEV || import.meta.env.VITE_DEBUG_LOGGING === 'true',
    level: (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'info',
    categories: new Set(['error', 'warn', 'analysis', 'upload'] as LogCategory[])
  };

  private static logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  private static shouldLog(level: LogLevel, category: LogCategory): boolean {
    if (!this.config.enabled) return level === 'error';
    
    // Always log errors
    if (level === 'error') return true;
    
    // Check level threshold
    if (this.logLevels[level] < this.logLevels[this.config.level]) {
      return false;
    }
    
    // Check if category is enabled
    return this.config.categories.has(category);
  }

  static debug(category: LogCategory, message: string, data?: any) {
    if (this.shouldLog('debug', category)) {
      console.debug(`[${category.toUpperCase()}] ${message}`, data || '');
    }
  }

  static info(category: LogCategory, message: string, data?: any) {
    if (this.shouldLog('info', category)) {
      console.info(`[${category.toUpperCase()}] ${message}`, data || '');
    }
  }

  static warn(category: LogCategory, message: string, data?: any) {
    if (this.shouldLog('warn', category)) {
      console.warn(`[${category.toUpperCase()}] ${message}`, data || '');
    }
  }

  static error(category: LogCategory, message: string, error?: any) {
    if (this.shouldLog('error', category)) {
      console.error(`[${category.toUpperCase()}] ${message}`, error || '');
    }
  }

  static configure(config: Partial<LogConfig>) {
    this.config = { ...this.config, ...config };
  }

  static enableCategory(category: LogCategory) {
    this.config.categories.add(category);
  }

  static disableCategory(category: LogCategory) {
    this.config.categories.delete(category);
  }
}

export { Logger };