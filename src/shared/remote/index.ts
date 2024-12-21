import Charm from "@rbxts/charm";
import { SyncPayload } from "@rbxts/charm-sync";
import { Client, createRemotes, loggerMiddleware, namespace, remote, Server } from "@rbxts/remo";
import { t } from "@rbxts/t";
import { GlobalAtoms } from "shared/datastore";
import { AccessToken, ActionType, Config, EntityReadinessMap, EntityState, HexGridConfig } from "shared/types/battle-types";

const remotes = createRemotes({
    loadCharacter: remote<Server>(),
    requestData: remote<Server, [storeName: string, key: string]>(),

    init: remote<Server>(),
    sync: remote<Client, [payload: SyncPayload<GlobalAtoms>]>(),

    battle_readinessSyncHydrate: remote<Server>(),
    battle_readinessSync: remote<Client, [payload: SyncPayload<{
        entitiesReadinessMap: Charm.Atom<EntityReadinessMap>;
    }>]>(),

    battle: namespace({
        // #region Client => Server
        request: remote<Server>(),
        requestSync: namespace({
            map: remote<Server>().returns<HexGridConfig>(t.interface({
                center: t.Vector2,
                radius: t.number,
                size: t.number,
                name: t.string,
            })),
            entities: remote<Server>().returns<EntityState[]>(),
        }),
        requestToAct: remote<Server>().returns<AccessToken>(t.interface({
            userId: t.number,
            allowed: t.boolean,
            token: t.optional(t.string),
            action: t.optional(
                t.interface({
                    actionType: t.literal(ActionType.Move, ActionType.Attack),
                    by: t.number,
                    against: t.optional(t.number),
                    executed: t.boolean,
                })),
        })),
        act: remote<Server, [action: AccessToken]>().returns<AccessToken>(),
        end: remote<Server, [access: AccessToken]>(), //#endregion

        //#region Server => Client
        forceUpdate: remote<Client>(),
        ui: namespace({
            mount: namespace({
                actionMenu: remote<Client>(),
                otherPlayersTurn: remote<Client>(),
            })
        }),
        createClient: remote<Client, [config: Partial<Config>]>(), //#endregion


    }),
}, loggerMiddleware)

export default remotes;