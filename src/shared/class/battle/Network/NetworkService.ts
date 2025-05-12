import { RunService } from "@rbxts/services";
import { serverRemotes, serverRequestRemote } from "shared/remote";

type ServerRemotesKey = keyof typeof serverRemotes;
type ServerRequestRemoteKey = keyof typeof serverRequestRemote;
type RemoteParam<K extends ServerRequestRemoteKey> =
    K extends 'act' ? Parameters<typeof serverRequestRemote['act']['request']>[0] : undefined;

export class NetworkService {
    private readonly connections: (() => void)[] = [];
    constructor() { }

    //#region Server-side
    public onServerRemote<T extends ServerRemotesKey>(
        key: T,
        callback: Parameters<typeof serverRemotes[T]['connect']>[0]
    ): () => void {
        const remote = serverRemotes[key];
        if (RunService.IsServer()) {
            // Use a function wrapper to handle the type compatibility issue
            function callbackWrapper(player: Player, ...rest: unknown[]) {
                return (callback as (...args: unknown[]) => unknown)(player, ...rest);
            }

            const cleanup = remote.connect(callbackWrapper as never);
            this.connections.push(cleanup);
            return () => {
                const index = this.connections.indexOf(cleanup);
                if (index !== -1) {
                    this.connections.remove(index);
                    cleanup(); // Disconnect the remote event
                }
            };
        } else {
            throw "Cannot call on() on client";
        }
    }

    public onServerRequestOf<T extends ServerRequestRemoteKey>(
        key: T,
        callback: Parameters<typeof serverRequestRemote[T]['onRequest']>[0]
    ): void {
        const remote = serverRequestRemote[key];
        if (RunService.IsServer()) {
            // Use a function wrapper to handle the type compatibility issue
            function requestCallbackWrapper(player: Player, ...rest: unknown[]) {
                return (callback as (...args: unknown[]) => unknown)(player, ...rest);
            }

            // Use 'never' type assertion to bypass the TypeScript error while maintaining runtime safety
            remote.onRequest(requestCallbackWrapper as never);
        } else {
            throw "Cannot call on() on client";
        }
    }
    //#endregion

    //#region Client-side
    /**
     * Type-safe request method with dynamic inference
     * The parameter is required only for remotes that need it (like 'act')
     */
    public request<K extends ServerRequestRemoteKey>(
        key: K,
        param?: RemoteParam<K>
    ): Promise<Awaited<ReturnType<typeof serverRequestRemote[K]['request']>>> {
        const remote = serverRequestRemote[key];

        if (RunService.IsClient()) {
            const requestMethod = remote.request;
            return requestMethod(param as never) as Promise<Awaited<ReturnType<typeof serverRequestRemote[K]['request']>>>;
        } else {
            throw "Cannot call request() on server";
        }
    }
    //#endregion

    public destroy() {
        this.connections.forEach(disconnect => disconnect());
        this.connections.clear();
    }
}
