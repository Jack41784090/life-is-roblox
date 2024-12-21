import { atom, Atom } from "@rbxts/charm";
import { server } from "@rbxts/charm-sync";
import { RunService } from "@rbxts/services";
import remotes from "shared/remote";
import { ActionValidator, Config, DEFAULT_HEIGHT, DEFAULT_WIDTH, DEFAULT_WORLD_CENTER, EntityReadinessMap } from "shared/types/battle-types";
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

    private validate({ declaredAccess, client, trueAccessCode, winningClient }: ActionValidator) {
        const { token, action, allowed } = declaredAccess
        const players = this.getAllPlayers();

        assert(players.find(p => p.UserId === client.UserId), "Player not found")
        assert(allowed, "Disallowed")
        assert(token === trueAccessCode, "Invalid access code");
        assert(action, "No action chosen");
        assert(client.UserId === winningClient.UserId, "Not the winning player");

    }

    private validateActionRequest({ winningClient, requestClient }: {
        winningClient: Player,
        requestClient: Player,
    }) {
        assert(winningClient.UserId === requestClient.UserId, "Not the winning player")
        return true;
    }

    private validateEnd({ client, declaredAccess, trueAccessCode, winningClient }: ActionValidator) {
        this.validate({ declaredAccess, client, trueAccessCode, winningClient });
        return true;
    }

    private validateAction({ client, declaredAccess, trueAccessCode, winningClient }: ActionValidator) {
        this.validate({ declaredAccess, client, trueAccessCode, winningClient });

        const { action } = declaredAccess;
        // Check the possibility of claimed action

        assert(declaredAccess.newState, "No new state provided")

        return true;
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
        const winningClient = players.find(p => p.UserId === winnerEntity.playerID)
        if (!winningClient) {
            warn("No winning player found")
            return;
        }

        // 2. Update Player UI's
        print(`2. Updating UI for all`)
        players.forEach(p => {
            if (p.UserId === winningClient.UserId) {
                remotes.battle.ui.mount.actionMenu(p);
            }
            else {
                remotes.battle.ui.mount.otherPlayersTurn(p);
            }
        });

        const accessCode = IDGenerator.generateID();
        remotes.battle.requestToAct.onRequest(p => {
            try {
                this.validateActionRequest({ winningClient, requestClient: p })
                return { userId: p.UserId, allowed: true, token: accessCode }
            }
            catch (e) {
                return { userId: p.UserId, allowed: false }
            }
        })
        remotes.battle.act.onRequest((p, access) => {
            try {
                this.validateAction({
                    client: p,
                    declaredAccess: access,
                    trueAccessCode: accessCode,
                    winningClient: winningClient,
                })
                this.grid.update(access.newState!);
                remotes.battle.forceUpdate(p);
                return access;
            }
            catch (e) {
                print("Invalid action", e)
                return { userId: p.UserId, allowed: false }
            }
        })
        const promise = remotes.battle.end.promise((p, s) => {
            try {
                this.validateEnd({
                    client: p,
                    declaredAccess: s,
                    trueAccessCode: accessCode,
                    winningClient: winningClient,
                })
                print(`Received end response: ${s} from ${p.Name}`)
                return true;
            }
            catch (e) {
                print("Invalid end", e)
                return false;
            }
        })

        await promise;
        print("Promise resolved", promise)
        this.round()
    }
}



export default Battle