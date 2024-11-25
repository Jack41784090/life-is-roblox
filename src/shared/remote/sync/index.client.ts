import { client } from "@rbxts/charm-sync";
import { Database } from "shared/datastore";
import remotes from "..";

const atoms = Database.GlobalAtoms()
const clientSync = client({ atoms })
remotes.sync.connect((payload) => {
    clientSync.sync(payload)
})

remotes.init();
