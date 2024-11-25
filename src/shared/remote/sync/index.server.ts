import { server } from "@rbxts/charm-sync";
import { Database } from "shared/datastore";
import { filterPayload } from "shared/utils";
import remotes from "..";

const atoms = Database.GlobalAtoms();
const syncer = server({ atoms });
syncer.connect((player, payload) => {
    remotes.sync(player, filterPayload(player, payload) as any);
});

remotes.init.connect((player) => {
    syncer.hydrate(player);
});
