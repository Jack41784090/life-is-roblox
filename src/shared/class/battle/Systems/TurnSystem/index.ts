import { atom, Atom, subscribe } from "@rbxts/charm";
import Logger from "shared/utils/Logger";
import { ReadinessFragment, TurnSystemConfig } from "./types";

export class TurnSystem {
    private logger = Logger.createContextLogger("TurnSystem");
    private currentActorId: number = -1;
    private readonly READINESS_TICK_INTERVAL: number;
    private isGauntletRunning = false;
    private listOfReadinessState: Atom<Array<Atom<ReadinessFragment>>>;

    constructor(config: TurnSystemConfig) {
        this.listOfReadinessState = config.readinessAtoms;
        this.READINESS_TICK_INTERVAL = config.gauntletTickInterval;
        const _logger = this.logger;
        subscribe(this.listOfReadinessState, (newList) => {
            _logger.debug("Readiness list updated", newList);
        })
    }

    public getCurrentActorID(): number {
        return this.currentActorId;
    }

    private gauntletTick(): void {
        this.logger.info("Readiness gauntlet in progress...");
        // Calculate readiness for entities
        for (const atom of this.listOfReadinessState()) {
            atom(frag => {
                const spd = frag.spd();
                const positionNow = frag.pos();
                frag.pos(positionNow + this.calculateReadinessIncrement(spd));
                return frag
            });
        }
    }

    private calculateReadinessIncrement(spd: number): number {
        return spd + math.random(-0.1, 0.1) * spd;
    }

    public async determineNextActorByGauntletGradual(): Promise<ReadinessFragment | undefined> {
        if (this.isGauntletRunning) {
            this.logger.warn("Readiness gauntlet already running, not starting a new one");
            return undefined;
        }

        this.isGauntletRunning = true;
        const listOfReadinessState = this.listOfReadinessState();

        if (listOfReadinessState.size() === 0) {
            this.logger.warn("Entity list is empty, cannot run readiness gauntlet");
            this.isGauntletRunning = false;
            return undefined;
        }

        try {
            // Continue ticking until someone reaches 100%
            while (!listOfReadinessState.some((e) => e().pos() >= 100)) {
                this.gauntletTick();
                await Promise.delay(this.READINESS_TICK_INTERVAL);
            }

            const nextActor = listOfReadinessState.sort((a, b) => a().pos() - b().pos() > 0)[0]();
            this.logger.info(`Readiness gauntlet winner: ${nextActor.id}`, nextActor);
            return nextActor;
        } catch (err) {
            this.logger.error(`Error in gradual readiness gauntlet: ${err}`);
            return undefined;
        } finally {
            this.isGauntletRunning = false;
        }
    }

    public getReadinessMap(): Map<number, ReadinessFragment> {
        return this.listOfReadinessState().reduce((map, atom) => {
            const frag = atom();
            return map.set(frag.id, frag);;
        }, new Map<number, ReadinessFragment>());
    }

    public getReadinessFragments() {
        return this.listOfReadinessState;
    }

    public updateFragments(givenFrags: ReadinessFragment[]): void {
        this.logger.debug("Updating fragments", givenFrags);
        const currentFragments: Array<Atom<ReadinessFragment>> = this.listOfReadinessState();
        const missingFrags: ReadinessFragment[] = [];
        const removingIndices: number[] = [];
        givenFrags.forEach(gf => {
            const frag = currentFragments.find(_f => gf.id === _f().id);
            if (frag) {
                frag(gf);
            }
            else {
                this.logger.debug(`Fragment with ID ${gf.id} not found in provided fragments`);
                missingFrags.push(gf);
            }
        });
        currentFragments.forEach((frag, i) => {
            if (!givenFrags.some((gf) => gf.id === frag().id)) {
                this.logger.debug(`Fragment with ID ${frag().id} not found in provided fragments`);
                removingIndices.push(i);
            }
        })

        removingIndices.forEach(i => currentFragments.remove(i));
        this.listOfReadinessState([
            ...currentFragments,
            ...missingFrags.map((frag) => atom(frag)),
        ])
    }

    // public endTurn(entityId: number): void {
    //     const entity = this.entityManager.getEntity(entityId);
    //     if (!entity) {
    //         this.logger.warn(`Cannot end turn: Entity ${entityId} not found`);
    //         return;
    //     }

    //     // Reset current actor if it's this entity
    //     if (this.currentActorId === entityId) {
    //         this.currentActorId = -1;
    //     }

    //     // Emit turn ended event
    //     this.eventBus.emit(GameEvent.TURN_ENDED, entity);

    //     // Additional turn end logic
    //     // ...implementation...
    // }

    // public async progressToNextTurn(): Promise<[Player, Entity] | undefined> {
    //     const nextActor = await this.determineNextActorByGauntletGradual();
    //     if (!nextActor) {
    //         return undefined;
    //     }

    //     const players = this.gameState.getAllPlayers();
    //     const winningClient = players.find((p) => p.UserId === nextActor.playerID);
    //     const winnerEntity = winningClient ? this.entityManager.getEntity(winningClient.UserId) : undefined;

    //     this.currentActorId = nextActor.playerID;
    //     return [winningClient!, winnerEntity!];
    // }

    // public destroy(): void {
    //     this.unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    //     this.unsubscribeFunctions = [];
    // }
}
