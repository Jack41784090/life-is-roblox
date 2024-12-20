import { atom, Atom } from "@rbxts/charm";
import { server } from "@rbxts/charm-sync";
import { RunService } from "@rbxts/services";
import remotes from "shared/remote";
import { Config, DEFAULT_HEIGHT, DEFAULT_WIDTH, DEFAULT_WORLD_CENTER, EntityReadinessMap } from "shared/types/battle-types";
import { warnWrongSideCall } from "shared/utils";
import { TILE_SIZE } from '../../types/battle-types';
import { IDGenerator } from "../IDGenerator";
import Entity from "./Entity";
import State from "./State";

type EntityMap = Map<string, Entity>;

class Battle extends State {
    private entities: Atom<EntityMap>;
    private entitiesReadinessMapAtom = atom<EntityReadinessMap>({});

    private cleanUp;

    public static Create(config: Partial<Config>) {
        if (RunService.IsServer()) {
            print("Creating Battle with ", config)
            if (!config.teamMap) {
                return;
            }

            // 1. Start sync server
            const battle = new Battle(config, () => { });
            const serverSyncer = server({
                atoms: {
                    entitiesReadinessMap: battle.entitiesReadinessMapAtom,
                }
            })
            const serverSyncConnection = serverSyncer.connect((p, pl) => {
                remotes.battle_readinessSync(p, pl);
            })
            const remoteHydrateConnection = remotes.battle_readinessSyncHydrate.connect(p => {
                serverSyncer.hydrate(p);
            })
            battle.cleanUp = () => {
                serverSyncConnection();
                remoteHydrateConnection();
            }
            remotes.battle.requestSync.map.onRequest(p => {
                const config = battle.grid.info();
                return config;
            })
            remotes.battle.requestSync.entities.onRequest(p => {
                const entities = battle.getAllEntities();
                return entities.map(e => e.info());
            })

            // 2. Initialise state
            battle.initialiseNumbers(config.teamMap);

            // 3. Initalise ClientSide for each Player
            battle.getAllPlayers().forEach(p => {
                print(`Initialising ClientSide for ${p.Name}`)
                remotes.battle.createClient(p, config);
            })

            // 4. Start the battle
            battle.round();
        }
        else {
            warnWrongSideCall("Battle.Create")
            return undefined;
        }
    }

    private constructor(config: Partial<Config>, cleanUp: () => void) {
        super(config.width ?? DEFAULT_WIDTH, config.height ?? DEFAULT_HEIGHT, config.worldCenter ?? DEFAULT_WORLD_CENTER, TILE_SIZE);
        this.entities = atom(new Map<string, Entity>());
        this.cleanUp = cleanUp
    }

    private setEntityReadiness(id: string, readiness: number) {
        this.entitiesReadinessMapAtom(s => {
            s = { ...s, [id]: readiness };
            return s;
        });
    }

    async round() {
        // 1. Readiness
        print(`1. Running readiness gauntlet`)
        const winnerEntity = this.runReadinessGauntlet();
        if (!winnerEntity) {
            warn("No winner entity found")
            return;
        }

        const players = this.getAllPlayers();
        const winningPlayer = players.find(p => p.UserId === winnerEntity.playerID)
        if (!winningPlayer) {
            warn("No winning player found")
            return;
        }

        // 2. Update Player UI's
        print(`2. Updating UI for all`)
        players.forEach(p => {
            remotes.battle.ui.mount.actionMenu(p);
        });

        const accessCode = IDGenerator.generateID();
        remotes.battle.requestToAct.onRequest(p => {
            if (p.UserId !== winningPlayer.UserId) {
                return {
                    userId: p.UserId,
                    allowed: false,
                    token: undefined,
                }
            }
            return {
                userId: p.UserId,
                allowed: true,
                token: accessCode,
            }
        })
        const promise = remotes.battle.act.promise((p, s) => {
            const { token, action, allowed } = s;
            if (!allowed) {
                warn("Disallowed")
                return false;
            }
            if (token !== accessCode) {
                warn("Invalid access code")
                return false;
            }
            if (!action) {
                warn("No action chosen")
                return false;
            }

            print(`Received response: ${s} from ${p.Name}`)
            return s.userId === winningPlayer.UserId;
        })

        await promise;
        print("Promise resolved", promise)
        this.round()
    }
}



export default Battle