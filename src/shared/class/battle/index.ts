import { RunService } from "@rbxts/services";
import remotes from "shared/remote";
import { ActionValidator, Config } from "shared/types/battle-types";
import { warnWrongSideCall } from "shared/utils";
import { IDGenerator } from "../IDGenerator";
import Entity from "./Entity";
import State from "./State";

type EntityMap = Map<string, Entity>;

class Battle {
    public static Create(config: Partial<Config>) {
        if (RunService.IsServer()) {
            return new Battle(config);
        }
        else {
            warnWrongSideCall("Battle.Create")
            return undefined;
        }
    }

    private state: State;

    private constructor(config: Partial<Config>) {
        assert(config.teamMap, "No team map provided")
        this.state = new State({
            width: config.width ?? 10,
            height: config.height ?? 10,
            worldCenter: config.worldCenter ?? new Vector3(),
            teamMap: config.teamMap ?? new Map(),
        });
        this.setUpRemotes();
        this.state.initialiseNumbers(config.teamMap);
        this.state.getAllPlayers().forEach(p => {
            print(`Initialising ClientSide for ${p.Name}`)
            remotes.battle.createClient(p, config);
        })
        this.round();
    }

    private setUpRemotes() {
        remotes.battle.requestSync.map.onRequest(p => {
            return this.state.gridInfo();
        })
        remotes.battle.requestSync.team.onRequest(p => {
            return this.state.teamInfo();
        })
    }

    private validate({ declaredAccess, client, trueAccessCode, winningClient }: ActionValidator) {
        const { token, action, allowed } = declaredAccess
        const players = this.state.getAllPlayers();

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
        const winnerEntity = this.state.runReadinessGauntlet();
        if (!winnerEntity) {
            warn("No winner entity found")
            return;
        }

        const players = this.state.getAllPlayers();
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
                this.state.grid.update(access.newState!);
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