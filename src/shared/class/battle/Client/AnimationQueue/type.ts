export interface iBattleAnimation {
    name: string;
    timeout: number;
    promise: Promise<unknown>
    promise_resolve: (_: unknown) => void;
}