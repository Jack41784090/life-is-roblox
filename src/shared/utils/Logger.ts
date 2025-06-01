/**
 * Logger - Professional logging utility for structured and configurable logging
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    FATAL = 4,
    NONE = 5 // Use to disable logging
}

export interface LoggerConfig {
    minLevel: LogLevel;
    includeTimestamp: boolean;
    context?: string;
    includeSource?: boolean;
}

export class Logger {
    private static instance: Logger;
    private config: LoggerConfig = {
        minLevel: LogLevel.DEBUG,
        includeTimestamp: false,
        includeSource: true
    };

    private constructor() { }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    public configure(config: Partial<LoggerConfig>): void {
        this.config = { ...this.config, ...config };
    }

    public getConfig(): LoggerConfig {
        return { ...this.config };
    }

    private getVisualSeparator(context?: string): string {
        if (!context) return "";

        let hash = 0;
        const length = context.size();

        for (let i = 1; i <= length; i++) {
            const [byteValue] = string.byte(context, i, i) as unknown as [number];
            hash = (hash + byteValue) % 10000;
        }

        const totalWidth = 12;
        const leftSpaces = hash % (totalWidth - 1);
        const rightSpaces = totalWidth - leftSpaces - 1;

        return string.rep(" ", leftSpaces) + "|" + string.rep(" ", rightSpaces);
    }

    private formatMessage(level: string, context?: string): string {
        const parts: string[] = [];

        if (this.config.includeTimestamp) {
            parts.push(`[${os.date("%H:%M:%S")}]`);
        }

        parts.push(`[${level}]`);

        if (context || this.config.context) {
            const ctx = context || this.config.context;
            parts.push(`[${ctx}]`);
        }

        return parts.join(" ");
    }

    public debug(...messages: (defined | undefined)[]): void {
        if (this.config.minLevel <= LogLevel.DEBUG) {
            const context = typeIs(messages[messages.size() - 1], "string") && messages.size() > 1 ?
                (messages as defined[]).pop() as string : undefined;
            const mesformat = this.formatMessage("DBG", context);
            print(`${mesformat}`, ...messages);
        }
    }

    public info(...messages: (defined | undefined)[]): void {
        if (this.config.minLevel <= LogLevel.INFO) {
            const context = typeIs(messages[messages.size() - 1], "string") && messages.size() > 1 ?
                (messages as defined[]).pop() as string : undefined;
            const mesformat = this.formatMessage("INF", context);
            print(`${mesformat}`, ...messages);
        }
    }

    public warn(...messages: (defined | undefined)[]): void {
        if (this.config.minLevel <= LogLevel.WARN) {
            const context = typeIs(messages[messages.size() - 1], "string") && messages.size() > 1 ?
                (messages as defined[]).pop() as string : undefined;
            const mesformat = this.formatMessage("WRN", context);
            warn(`${mesformat}`, ...messages);
        }
    }

    public error(...messages: (defined | undefined)[]): void {
        if (this.config.minLevel <= LogLevel.ERROR) {
            const context = typeIs(messages[messages.size() - 1], "string") && messages.size() > 1 ?
                (messages as defined[]).pop() as string : undefined;
            const mesformat = this.formatMessage("ERR", context);
            warn(`${mesformat}`, ...messages);
        }
    }

    public fatal(...messages: (defined | undefined)[]): void {
        if (this.config.minLevel <= LogLevel.FATAL) {
            const context = typeIs(messages[messages.size() - 1], "string") && messages.size() > 1 ?
                (messages as defined[]).pop() as string : undefined;
            const mesformat = this.formatMessage("FTL", context);
            warn(`${mesformat}`, ...messages);
        }
    }

    public createContextLogger(context: string): ContextLogger {
        return new ContextLogger(this, context);
    }
}

/**
 * A logger instance bound to a specific context
 */
export class ContextLogger {
    constructor(
        private logger: Logger,
        private context: string
    ) { }

    public recontext(newContext: string): void {
        this.context = newContext;
    }

    public debug(...messages: (defined | undefined)[]): void {
        // Fix: append context to messages array before spreading
        const messagesWithContext = [...messages, this.context];
        this.logger.debug(...messagesWithContext);
    }

    public info(...messages: (defined | undefined)[]): void {
        const messagesWithContext = [...messages, this.context];
        this.logger.info(...messagesWithContext);
    }

    public warn(...messages: (defined | undefined)[]): void {
        const messagesWithContext = [...messages, this.context];
        this.logger.warn(...messagesWithContext);
    }

    public error(...messages: (defined | undefined)[]): void {
        const messagesWithContext = [...messages, this.context];
        this.logger.error(...messagesWithContext);
    }

    public fatal(...messages: (defined | undefined)[]): void {
        const messagesWithContext = [...messages, this.context];
        this.logger.fatal(...messagesWithContext);
    }
}

export default Logger.getInstance();
