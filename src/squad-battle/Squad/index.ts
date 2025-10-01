import { uniformRandom } from "shared/utils";
import Logger, { ContextLogger } from "shared/utils/Logger";
import { SquadEntity } from "squad-battle/Entity";
import { createLogic } from "squad-battle/Entity/Logic/factory";
import { EntityUpdate, SquadConfig, SquadEntityInSquadLocation } from "squad-battle/type";
import { iSquad } from "./type.d";

export class Squad implements iSquad {
    team: string = '';
    logger: ContextLogger;
    entities: SquadEntity[];
    name: string;

    // initiative: number;
    // organisation: number;
    // antiair: number;

    constructor(configs: SquadConfig) {
        this.entities = configs.entities.map(c => {
            const entity = new SquadEntity({
                ...c,
            });
            // Update the logic to reference the actual entity
            entity.setLogic(createLogic(entity, c.logicType));
            return entity;
        });
        this.name = configs.name;
        this.logger = Logger.createContextLogger(`Squad:${configs.name}`);
        this.team = configs.team || '';
    }

    public isCrippled(): boolean {
        return this.entities.size() === 0;;
    }

    get_allEntities(): Partial<Record<SquadEntityInSquadLocation, SquadEntity[]>> {
        return this.entities.reduce((A, se) => {
            const loc = se.get_changeableStat_num('LOC') as SquadEntityInSquadLocation;
            if (A[loc]?.size()) {
                // size is not 0 or null
                A[loc].push(se)
            }
            else {
                A[loc] = [se]
            }
            return A;
        }, {} as Partial<Record<SquadEntityInSquadLocation, SquadEntity[]>>)
    }

    recovery() {
        this.logger.debug("offered a recovery")
        this.entities.forEach(e => e.recover());
    }

    private _lastRoundReceivedAttack: number = -1;
    // public receiveAttack(from: Squad, roundCount: number): EntityUpdate[] {
    //     this._lastRoundReceivedAttack = roundCount;
    //     const squadsize = from.entities.size();
    //     const entityUpdates: EntityUpdate[] = [];
    //     // from.entities.sort((a, b))
    //     for (let i = 0; i < squadsize; i++) {
    //         const attackingEntity = from.entities[i];
    //         const attackUpdates = attackingEntity.action(from.get_allEntities(), this.get_allEntities());
    //         attackUpdates.forEach(au => entityUpdates.push(au));
    //     }

    //     return entityUpdates;
    // }

    get_lastAttackedAtRound() {
        return this._lastRoundReceivedAttack;
    }

    private squadAttack(enemySquad: Squad, roundCount: number) {
        this.logger.debug(`${this.name} ⚔️ ${enemySquad.name}`)
        const updatesAfterAttack: EntityUpdate[] = [];

        this._lastRoundReceivedAttack = roundCount;
        // this.logger.debug("Attacking " + enemySquad.name);
        const ourSquad_size = this.entities.size();
        const our_squad = this.get_allEntities();
        const enemySquad_size = enemySquad.entities.size();
        const enemy_squad = enemySquad.get_allEntities()

        // TODO: tactics effects activate before attack
        // TODO: action + reaction depends on stats
        for (let i = 0; i < ourSquad_size; i++) {
            const ourBoy = this.entities[i];
            ourBoy.action(our_squad, enemy_squad)
                .forEach(r => {
                    updatesAfterAttack.push(r)
                }
                );
        }
        for (let i = 0; i < enemySquad_size; i++) {
            const enemy = enemySquad.entities[i];
            enemy.reaction(enemy_squad, our_squad)
                .forEach(r => {
                    updatesAfterAttack.push(r)
                }
                );
        }

        return updatesAfterAttack;
    }

    private chooseEnemySquad(enemySquads: Squad[]): Squad | undefined {
        let chosenSquad: Squad | undefined = undefined;
        if (enemySquads.size() > 0) {
            chosenSquad = enemySquads[uniformRandom(0, enemySquads.size() - 1, true)];
        }
        return chosenSquad;
    }

    private act_attackRandom(targetableSquads: Squad[], roundCount: number): EntityUpdate[] | undefined {
        // 1. Choose enemy squad
        const enemySquad = this.chooseEnemySquad(targetableSquads);

        // 2. Attack enemy squad
        return enemySquad ? this.squadAttack(enemySquad, roundCount) : undefined;
    }

    private act_idle(): undefined {
        this.logger.debug("idling")
        return undefined;
        // return this.recovery();
    }

    round(enemySquads: Squad[], roundCount: number) {
        const random = math.random();
        this.entities.forEach(e => e.newRoundReset());
        if (random >= .5) {
            return this.act_attackRandom(enemySquads, roundCount);
        }
        else {
            return this.act_idle();
        }
        return this.act_attackRandom(enemySquads, roundCount);

    }
}