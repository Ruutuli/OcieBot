import chalk from 'chalk';

export enum LogLevel {
  INFO = 'info',
  SUCCESS = 'success',
  WARN = 'warn',
  ERROR = 'error',
  DEBUG = 'debug'
}

class Logger {
  private getTimestamp(): string {
    return new Date().toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  private formatMessage(level: LogLevel, message: string, emoji: string): string {
    const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
    const levelColor = this.getLevelColor(level);
    const levelText = levelColor(level.toUpperCase().padEnd(7));
    
    return `${timestamp} ${emoji} ${levelText} ${chalk.white(message)}`;
  }

  private getLevelColor(level: LogLevel) {
    switch (level) {
      case LogLevel.SUCCESS:
        return chalk.green.bold;
      case LogLevel.INFO:
        return chalk.blue.bold;
      case LogLevel.WARN:
        return chalk.yellow.bold;
      case LogLevel.ERROR:
        return chalk.red.bold;
      case LogLevel.DEBUG:
        return chalk.magenta.bold;
      default:
        return chalk.white.bold;
    }
  }

  info(message: string) {
    console.log(this.formatMessage(LogLevel.INFO, message, 'ℹ️'));
  }

  success(message: string) {
    console.log(this.formatMessage(LogLevel.SUCCESS, message, '✅'));
  }

  warn(message: string) {
    console.warn(this.formatMessage(LogLevel.WARN, message, '⚠️'));
  }

  error(message: string) {
    console.error(this.formatMessage(LogLevel.ERROR, message, '❌'));
  }

  debug(message: string) {
    console.log(this.formatMessage(LogLevel.DEBUG, message, '🔍'));
  }

  showBanner() {
    const banner = `
${chalk.cyan.bold('═══════════════════════════════════════════════════════════')}
${chalk.magenta.bold('                    🤖 OCIE BOT 🤖')}
${chalk.cyan.bold('═══════════════════════════════════════════════════════════')}
    `;
    console.log(banner);
  }

  showStartupInfo(version: string = '1.0.0') {
    this.info(`Version: ${chalk.cyan(version)}`);
    this.info(`Node.js: ${chalk.cyan(process.version)}`);
    this.info(`Platform: ${chalk.cyan(process.platform)}`);
    this.info(`Environment: ${chalk.cyan(process.env.NODE_ENV || 'development')}`);
  }
}

export const logger = new Logger();
