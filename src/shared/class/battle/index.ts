import { RunService } from "@rbxts/services";
import { MOVEMENT_COST } from "shared/const";
import remotes from "shared/remote";
import { ActionType, ActionValidator, Config, MoveAction } from "shared/types/battle-types";
import { warnWrongSideCall } from "shared/utils";
import { IDGenerator } from "../IDGenerator";
import State from "./State";

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
        print(`Creation of Battle with config: `, config)
        assert(config.teamMap, "No team map provided")
        this.state = new State({
            width: config.width ?? 10,
            worldCenter: config.worldCenter ?? new Vector3(),
            teamMap: config.teamMap,
        });
        this.state.getAllPlayers().forEach(p => {
            print(`Initialising ClientSide for ${p.Name}`)
            remotes.battle.createClient(p, config);
        })
        this.setUpRemotes();
        this.round();
    }

    private setUpRemotes() {
        remotes.battle.requestSync.map.onRequest(p => {
            const gi = this.state.gridInfo();
            return gi;
        })
        remotes.battle.requestSync.team.onRequest(p => {
            return this.state.teamInfo();
        })
        remotes.battle.requestSync.state.onRequest(p => {
            return this.state.info();
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

    private checkMovementPossibility(action: MoveAction) {
        const { from, to } = action;
        const fromCell = this.state.getCell(from);
        const toCell = this.state.getCell(to);

        assert(fromCell, "No from cell found")
        assert(toCell, "No to cell found")

        const fromEntityID = fromCell.entity;
        const toEntityID = toCell.entity;

        assert(fromEntityID, "No entity found in from cell")
        assert(!toEntityID, "Entity already present in to cell")

        const fromEntity = this.state.findEntity(fromEntityID);
        assert(fromEntity, "Invalid entity ID")

        const costOfMovement = MOVEMENT_COST * this.state.findDistance(from, to);
        const currentPosture = fromEntity.get('pos');
        assert(currentPosture >= costOfMovement, "Not enough posture to move")

        return true;
    }

    private validateAction({ client, declaredAccess, trueAccessCode, winningClient }: ActionValidator) {
        this.validate({ declaredAccess, client, trueAccessCode, winningClient });

        const { action } = declaredAccess;
        if (action?.type === ActionType.Move) this.checkMovementPossibility(action as MoveAction);
        if (action?.type === ActionType.Attack) {

        }

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
        this.state.creID = winnerEntity.playerID;
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

        let endPromiseResolve: (p: Player) => void;
        remotes.battle.act.onRequest((actingPlayer, access) => {
            print(`Received action request from ${actingPlayer.Name}`, access)

            // 1. Validate
            let er: unknown | undefined;
            try {
                this.validateAction({
                    client: actingPlayer,
                    declaredAccess: access,
                    trueAccessCode: accessCode,
                    winningClient: winningClient,
                })
            }
            catch (e) {
                er = e;
            }

            // 2. Commit if no error
            if (er) {
                warn("Error", er)
            }
            else {
                this.state.commit(access.action!);
                remotes.battle.animate(actingPlayer, access);
            }


            // 3. Update all players
            this.state.getAllPlayers().forEach(p => remotes.battle.forceUpdate(p));

            // 4. Check if pos of actingPlayer (cre) is below 75% and end round
            const cre = this.state.findEntity(actingPlayer.UserId);
            assert(cre, "Critcal Error: CRE could not be found with actingPlayer.UserId")
            assert(cre.playerID === this.state.creID, "Critical Error: CRE ID mismatch")
            const posture = cre.get('pos'); print(`posture: ${posture}`)
            if (cre.get('pos') < 75) {
                print("Ending round")
                endPromiseResolve(actingPlayer);
            }

            return {
                userId: actingPlayer.UserId,
                allowed: er === undefined,
                token: accessCode,
                action: access.action,
            }
        })

        const endPromise = new Promise((resolve) => {
            endPromiseResolve = resolve;
            remotes.battle.end.promise((p, s) => {
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
            }).then((p) => {
                print(`End promise resolved`, p)
                resolve(p);
            })
        })

        await endPromise;
        print("Promise resolved", endPromise)

        this.round()
    }
}

export default Battle
