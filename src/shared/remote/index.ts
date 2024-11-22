import { SyncPayload } from "@rbxts/charm-sync";
import { Client, createRemotes, remote, Server } from "@rbxts/remo";
import { GlobalAtoms } from "shared/datastore";

const remotes = createRemotes({
    loadCharacter: remote<Server>(),
    requestData: remote<Server, [storeName: string, key: string]>(),

    init: remote<Server>(),
    sync: remote<Client, [payload: SyncPayload<GlobalAtoms>]>(),


    battle_Start: remote<Server>(),

})

export default remotes;