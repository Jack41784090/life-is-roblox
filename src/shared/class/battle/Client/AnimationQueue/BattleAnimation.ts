import Logger from "shared/utils/Logger";
import { iBattleAnimation } from './type';

export default class BattleAnimation {
    public readonly name: string;
    public readonly timeout: number;
    private promise: Promise<unknown>;
    private resolver: (_: unknown) => void;
    private startTime: number;
    private logger = Logger.createContextLogger("BattleAnimation");

    constructor(config: iBattleAnimation) {
        this.name = config.name;
        this.timeout = config.timeout;
        this.resolver = config.promise_resolve;
        this.startTime = tick();

        this.promise = this.createTimeoutPromise(config.promise);
    }

    private createTimeoutPromise(originalPromise: Promise<unknown>): Promise<unknown> {
        return Promise.race([
            originalPromise,
            new Promise((_, reject) => {
                task.delay(this.timeout, () => {
                    const duration = tick() - this.startTime;
                    reject(`Animation ${this.name} timed out after ${math.floor(duration * 100) / 100}s (limit: ${this.timeout}s)`);
                });
            })
        ]).then(
            (result) => {
                const duration = tick() - this.startTime;
                this.logger.debug(`Animation ${this.name} completed in ${math.floor(duration * 100) / 100}s`);
                this.resolver(result);
                return result;
            },
            (err) => {
                this.resolver(void 0);
                throw err;
            }
        );
    }

    public awaitingPromise(): Promise<unknown> {
        return this.promise;
    }

    public getDuration(): number {
        return tick() - this.startTime;
    }
}