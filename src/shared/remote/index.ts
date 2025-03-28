import { SyncPayload } from "@rbxts/charm-sync";
import { Client, createRemotes, loggerMiddleware, namespace, remote, Server } from "@rbxts/remo";
import { t } from "@rbxts/t";
import { GuiTag } from "shared/const";
import { GlobalAtoms } from "shared/datastore";
import { AccessToken, ActionType, Config, HexGridState, StateState, TeamState } from "shared/types/battle-types";

const remotes = createRemotes({
    loadCharacter: remote<Server>(),
    requestData: remote<Server, [storeName: string, key: string]>(),

    init: remote<Server>(),
    sync: remote<Client, [payload: SyncPayload<GlobalAtoms>]>(),

    battle: namespace({
        // #region Client => Server
        requestRoom: remote<Server>(),
        request: remote<Server>(),
        requestSync: namespace({
            map: remote<Server>().returns<HexGridState>(),
            team: remote<Server>().returns<TeamState[]>(),
            state: remote<Server>().returns<StateState>(),
        }),
        requestToAct: remote<Server>().returns<AccessToken>(t.interface({
            userId: t.number,
            allowed: t.boolean,
            token: t.optional(t.string),
            action: t.optional(
                t.interface({
                    type: t.literal(ActionType.Move, ActionType.Attack),
                    by: t.number,
                    against: t.optional(t.number),
                    executed: t.boolean,
                })),
        })),
        act: remote<Server, [action: AccessToken]>().returns<AccessToken>(),
        end: remote<Server, [access: AccessToken]>(), //#endregion

        //#region Server => Client
        chosen: remote<Client>(),
        forceUpdate: remote<Client>(),
        animate: remote<Client, [action: AccessToken]>(),
        camera: namespace({
            hoi4: remote<Client>(),
        }),
        ui: namespace({
            unmount: remote<Client, [tag: GuiTag]>(),
            startRoom: remote<Client, [arg: Player[]]>(),
            mount: namespace({
                actionMenu: remote<Client>(),
                otherPlayersTurn: remote<Client>(),
            })
        }),
        createClient: remote<Client, [config: Partial<Config>]>(), //#endregion
    }),
}, loggerMiddleware)

export default remotes;