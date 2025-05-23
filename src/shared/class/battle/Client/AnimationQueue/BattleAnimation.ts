import { setTimeout } from "@rbxts/set-timeout";
import { iBattleAnimation } from './type';

export default class BattleAnimation {
    private promise: Promise<unknown>;

    constructor(config: iBattleAnimation) {
        this.promise = config.promise;
        setTimeout(() => {
            config.promise_resolve(void 0);
        }, config.timeout)
    }

    public awaitingPromise() {
        return this.promise
    }
}