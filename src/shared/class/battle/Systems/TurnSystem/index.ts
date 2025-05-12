import { atom, Atom } from "@rbxts/charm";
import Logger from "shared/utils/Logger";
import { ReadinessFragment, TurnSystemConfig } from "./types";

export class TurnSystem {
    private logger = Logger.createContextLogger("TurnSystem");
    private currentActorId: number = -1;
    private readonly READINESS_TICK_INTERVAL: number;
    private isGauntletRunning = false;
    private readinessAtoms: Atom<ReadinessFragment>[];

    constructor(config: TurnSystemConfig) {
        this.readinessAtoms = config.readinessAtoms;
        this.READINESS_TICK_INTERVAL = config.gauntletTickInterval;
    }

    public getCurrentActorID(): number {
        return this.currentActorId;
    }

    private gauntletTick(): void {
        this.logger.info("Readiness gauntlet in progress...");
        // Calculate readiness for entities
        for (const atom of this.readinessAtoms) {
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

        if (this.readinessAtoms.size() === 0) {
            this.logger.warn("Entity list is empty, cannot run readiness gauntlet");
            this.isGauntletRunning = false;
            return undefined;
        }

        try {
            // Continue ticking until someone reaches 100%
            while (!this.readinessAtoms.some((e) => e().pos() >= 100)) {
                this.gauntletTick();
                await Promise.delay(this.READINESS_TICK_INTERVAL);
            }

            const nextActor = this.readinessAtoms.sort((a, b) => a().pos() - b().pos() > 0)[0]();
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
        return this.readinessAtoms.reduce((map, atom) => {
            const frag = atom();
            return map.set(frag.id, frag);;
        }, new Map<number, ReadinessFragment>());
    }

    public getReadinessFragments() {
        return this.readinessAtoms;
    }

    public updateFragments(fragments: ReadinessFragment[]): void {
        this.logger.debug("Updating fragments", fragments);
        fragments.forEach((fr) => {
            const frag = this.readinessAtoms.find((f) => f().id === fr.id);
            if (frag) {
                frag(fr);
            }
            else {
                this.logger.debug(`Fragment with ID ${fr.id} not found in provided fragments`);
                this.readinessAtoms.push(atom(fr));
            }
        });
        this.readinessAtoms.forEach((frag, i) => {
            if (!fragments.some((f) => f.id === frag().id)) {
                this.logger.debug(`Fragment with ID ${frag().id} not found in provided fragments`);
                this.readinessAtoms.remove(i);
            }
        })
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
