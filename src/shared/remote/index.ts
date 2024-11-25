import { SyncPayload } from "@rbxts/charm-sync";
import { Client, createRemotes, remote, Server } from "@rbxts/remo";
import { GlobalAtoms } from "shared/datastore";
import { Config } from "shared/types/battle-types";

const remotes = createRemotes({
    loadCharacter: remote<Server>(),
    requestData: remote<Server, [storeName: string, key: string]>(),

    init: remote<Server>(),
    sync: remote<Client, [payload: SyncPayload<GlobalAtoms>]>(),


    battle_Start: remote<Server>(),
    battle_ClientBegin: remote<Client, [config: Partial<Config>]>(),

})

export default remotes;