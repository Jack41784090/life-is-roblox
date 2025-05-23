import { RunService } from "@rbxts/services";
import { serverRemotes, serverRequestRemote } from "shared/remote";
import Logger from "shared/utils/Logger";
import { clientRemotes } from '../../../remote/index';

type ServerRemotesKey = keyof typeof serverRemotes;
type ServerRequestRemoteKey = keyof typeof serverRequestRemote;
type ClientRemotesKey = keyof typeof clientRemotes;
// type RemoteParam<K extends ServerRequestRemoteKey> =
//     K extends 'act' ? Parameters<typeof serverRequestRemote['act']['request']>[0] : undefined;
type RemoteParam<K extends ServerRequestRemoteKey> =
    Parameters<typeof serverRequestRemote[K]['request']>
type RemoteNoParam<K extends ServerRequestRemoteKey> =
    Parameters<typeof serverRequestRemote[K]['request']>[0] extends undefined ? [] : Parameters<typeof serverRequestRemote[K]['request']>;

export class NetworkService {
    private logger = Logger.createContextLogger("NetworkService");
    private readonly connections: (() => void)[] = [];
    constructor() { }

    //#region Server-side
    public onServerRemote<T extends ServerRemotesKey>(key: T, callback: Parameters<typeof serverRemotes[T]['connect']>[0]): () => void {
        const remote = serverRemotes[key];
        if (RunService.IsServer()) {
            const callbackWrapper = (player: Player, ...rest: unknown[]) => {
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

    public onServerRequestOf<T extends ServerRequestRemoteKey>(key: T, callback: Parameters<typeof serverRequestRemote[T]['onRequest']>[0]): void {
        const remote = serverRequestRemote[key];
        if (RunService.IsServer()) {
            const requestCallbackWrapper = (player: Player, ...rest: unknown[]) => {
                return (callback as (...args: unknown[]) => unknown)(player, ...rest);
            }
            remote.onRequest(requestCallbackWrapper as never);
        } else {
            throw "Cannot call on() on client";
        }
    }
    //#endregion

    //#region Client-side
    // public request<K extends ServerRequestRemoteKey>(key: K, ...param: (RemoteParam<K> | RemoteNoParam<K>)): ReturnType<typeof serverRequestRemote[K]['request']> {

    //     const remote = serverRequestRemote[K];
    //     if (RunService.IsClient()) {
    //         // const requestMethod = (...param: unknown[]) => { return remote.request(...param) };
    //         // // remote.request()
    //         // return requestMethod(param as never) as ReturnType<typeof serverRequestRemote[K]['request']>;
    //         if (param.size() === 0) {
    //             return remote.request() as ReturnType<typeof serverRequestRemote[K]['request']>;
    //         }
    //         return remote.request(...param as unknown[]) as ReturnType<typeof serverRequestRemote[K]['request']>;
    //     } else {
    //         throw "Cannot call request() on server";
    //     }
    // }

    public onClientRemote<T extends ClientRemotesKey>(key: T, callback: Parameters<typeof clientRemotes[T]['connect']>[0]): void {
        const remote = clientRemotes[key];
        if (RunService.IsClient()) {
            const requestCallbackWrapper = (player: Player, ...rest: unknown[]) => {
                return (callback as (...args: unknown[]) => unknown)(player, ...rest);
            }
            remote.connect(requestCallbackWrapper as never);
        } else {
            throw "Cannot call on() on server";
        }
    }
    //#endregion

    public destroy() {
        this.connections.forEach(disconnect => disconnect());
        this.connections.clear();
    }
}