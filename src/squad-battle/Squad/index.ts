import { uniformRandom } from "shared/utils";
import Logger, { ContextLogger } from "shared/utils/Logger";
import { SquadEntity } from "squad-battle/Entity";
import { EntityUpdate, SquadConfig, SquadEntityInSquadLocation, SquadUpdate } from "squad-battle/type";

export class Squad {
    team: string = '';
    logger: ContextLogger;
    entities: SquadEntity[];
    name: string;

    // initiative: number;
    // organisation: number;
    // antiair: number;

    constructor(configs: SquadConfig) {
        this.entities = configs.entities.map(c => new SquadEntity(c))
        this.name = configs.name;
        this.logger = Logger.createContextLogger(`Squad:${configs.name}`);
        this.team = configs.team || '';
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
    receiveAttack(from: Squad, roundCount: number): SquadUpdate {
        this._lastRoundReceivedAttack = roundCount;
        const squadsize = from.entities.size();
        const entityUpdates: EntityUpdate[] = [];
        // from.entities.sort((a, b))
        for (let i = 0; i < squadsize; i++) {
            const attackingEntity = from.entities[i];
            const attackUpdates = attackingEntity.attack(from.get_allEntities(), this.get_allEntities());
            attackUpdates.forEach(au => entityUpdates.push(au));
        }

        return {
            entityUpdates,
        };
    }

    get_lastAttackedAtRound() {
        return this._lastRoundReceivedAttack;
    }

    private chooseEnemySquad(enemySquads: Squad[]): Squad | undefined {
        let chosenSquad: Squad | undefined = undefined;
        if (enemySquads.size() > 0) {
            chosenSquad = enemySquads[uniformRandom(0, enemySquads.size() - 1, true)];
        }
        return chosenSquad;
    }

    private act_attackRandom(targetableSquads: Squad[], roundCount: number): SquadUpdate | undefined {
        // 1. Choose enemy squad
        const enemySquad = this.chooseEnemySquad(targetableSquads);

        // 2. Attack enemy squad
        if (enemySquad) {
            this._lastRoundReceivedAttack = roundCount;
            this.logger.debug("Attacking " + enemySquad.name);
            return enemySquad.receiveAttack(this, roundCount);
        }
    }

    private act_idle(): SquadUpdate | undefined {
        this.logger.debug("idling")
        return undefined;
        // return this.recovery();
    }

    round(enemySquads: Squad[], roundCount: number) {
        const random = math.random();
        // if (random >= .5) {
        //     return this.act_attackRandom(enemySquads, roundCount);
        // }
        // else {
        //     return this.act_idle();
        // }
        return this.act_attackRandom(enemySquads, roundCount);

    }
}