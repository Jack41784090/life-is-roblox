import { iSquadEntity } from "../Entity/type.d";
import { EntityUpdate, SquadEntityInSquadLocation } from "../type";

export interface iSquad {
    team: string;
    entities: iSquadEntity[];
    name: string;

    isCrippled(): boolean;
    get_allEntities(): Partial<Record<SquadEntityInSquadLocation, iSquadEntity[]>>;
    recovery(): void;
    get_lastAttackedAtRound(): number;
    round(enemySquads: iSquad[], roundCount: number): EntityUpdate[] | undefined;
}