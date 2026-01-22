// 日志工具 - 统一的日志输出，方便调试
const LOG_PREFIX = '[PDCA]';

export const LogLevel = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    module: string;
    message: string;
    data?: unknown;
}

// 存储日志历史，方便导出调试
const logHistory: LogEntry[] = [];
const MAX_LOG_HISTORY = 500;

function formatTimestamp(): string {
    return new Date().toISOString();
}

function createLogEntry(level: LogLevel, module: string, message: string, data?: unknown): LogEntry {
    const entry: LogEntry = {
        timestamp: formatTimestamp(),
        level,
        module,
        message,
        data,
    };

    // 保存到历史
    logHistory.push(entry);
    if (logHistory.length > MAX_LOG_HISTORY) {
        logHistory.shift();
    }

    return entry;
}

function formatLog(entry: LogEntry): string {
    const dataStr = entry.data !== undefined ? ` | ${JSON.stringify(entry.data)}` : '';
    return `${LOG_PREFIX} [${entry.timestamp}] [${entry.level}] [${entry.module}] ${entry.message}${dataStr}`;
}

export const logger = {
    debug(module: string, message: string, data?: unknown) {
        const entry = createLogEntry(LogLevel.DEBUG, module, message, data);
        console.debug(formatLog(entry));
    },

    info(module: string, message: string, data?: unknown) {
        const entry = createLogEntry(LogLevel.INFO, module, message, data);
        console.info(formatLog(entry));
    },

    warn(module: string, message: string, data?: unknown) {
        const entry = createLogEntry(LogLevel.WARN, module, message, data);
        console.warn(formatLog(entry));
    },

    error(module: string, message: string, data?: unknown) {
        const entry = createLogEntry(LogLevel.ERROR, module, message, data);
        console.error(formatLog(entry));
    },

    // 获取所有日志历史
    getHistory(): LogEntry[] {
        return [...logHistory];
    },

    // 导出日志为文本
    exportLogs(): string {
        return logHistory.map(formatLog).join('\n');
    },

    // 清空日志历史
    clearHistory() {
        logHistory.length = 0;
    },
};

export default logger;
