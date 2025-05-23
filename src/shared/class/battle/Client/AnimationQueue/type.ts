export interface iBattleAnimation {
    timeout: number;
    promise: Promise<unknown>
    promise_resolve: (_: unknown) => void;
}