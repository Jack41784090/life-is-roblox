import Charm from "@rbxts/charm";
import { SyncPayload } from "@rbxts/charm-sync";
import { Client, createRemotes, loggerMiddleware, namespace, remote, Server } from "@rbxts/remo";
import { t } from "@rbxts/t";
import { GlobalAtoms } from "shared/datastore";
import { AccessToken, HexGridConfig } from "shared/types";
import { Config, EntityInitRequirements, EntityReadinessMap } from "shared/types/battle-types";

const remotes = createRemotes({
    loadCharacter: remote<Server>(),
    requestData: remote<Server, [storeName: string, key: string]>(),

    init: remote<Server>(),
    sync: remote<Client, [payload: SyncPayload<GlobalAtoms>]>(),

    battle_readinessSyncHydrate: remote<Server>(),
    battle_readinessSync: remote<Client, [payload: SyncPayload<{
        entitiesReadinessMap: Charm.Atom<EntityReadinessMap>;
    }>]>(),

    battle_ClientBegin: remote<Client, [config: Partial<Config>]>(),
    battle_UpdateMap: remote<Client, [mapConfig: HexGridConfig]>(),

    battle_AddEntity: remote<Client, [entity: EntityInitRequirements, pos: Vector2]>(),

    battle: namespace({
        // #region Client => Server
        start: remote<Server>(),
        requestMapUpdate: remote<Server>().returns<HexGridConfig>(t.interface({
            center: t.Vector2,
            radius: t.number,
            size: t.number,
            name: t.string,
        })),
        requestToAct: remote<Server>().returns<AccessToken>(t.interface({
            userId: t.number,
            allowed: t.boolean,
            token: t.optional(t.string),
            action: t.optional(t.string),
        })),
        act: remote<Server, [action: AccessToken]>(), //#endregion

        //#region Server => Client
        ui: namespace({
            mount: namespace({
                actionMenu: remote<Client>(),
            })
        }),
        createClient: remote<Client, [config: Partial<Config>]>(), //#endregion


    }),
}, loggerMiddleware)

export default remotes;