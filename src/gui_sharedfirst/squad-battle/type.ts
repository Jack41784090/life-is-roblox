import { SquadEntity } from "squad-battle/Entity";
import { Squad } from "squad-battle/Squad";
import { EntityChangeableStats, EntityUpdate, SquadEntityInSquadLocation } from "squad-battle/type";
import { EntityUpdateIndicator } from "./entity/types";

// Base common props
export interface BaseUIProps {
    Size?: UDim2;
}

export interface TeamIdentityProps {
    name: string;
    team: string;
}

export interface TeamNameProps {
    teamName: string;
}

export interface RoundProps {
    currentRound?: number;
}

export interface UpsideDownProps {
    upsideDown?: boolean;
}

export interface EntityUpdatesProps {
    entityUpdates?: EntityUpdateIndicator[];
}

export interface RawEntityUpdatesProps {
    entityUpdates?: EntityUpdate[];
}

export interface SingleEntityProps {
    entity: SquadEntity;
}

export interface MultipleEntitiesProps {
    entities: SquadEntity[];
}

export interface SingleSquadProps {
    squad: Squad;
}

export interface MultipleSquadsProps {
    squads: Squad[];
}

export interface SquadCollectionProps {
    squads: Record<string, Squad[]>;
}

export interface StatsProps {
    changeableStats: EntityChangeableStats;
}

export interface TransferFunctionProps {
    transferFunction: (entity: SquadEntity, newLocation: SquadEntityInSquadLocation) => void;
}

export interface SyncProps {
    syncAfterSecond: number;
}

export interface EntityPortraitStateProps {
    isDying?: boolean;
    isRetreating?: boolean;
    isAttacking?: boolean;
    setAttacking?: (val: boolean) => void;
}

// Composed prop types using intersection
export type SquadDisplayProps = TeamIdentityProps & MultipleEntitiesProps & UpsideDownProps & EntityUpdatesProps & SyncProps & {
    teamSize: number;
};

export type BattleFieldProps = SquadCollectionProps & RoundProps & RawEntityUpdatesProps & {
    playerTeamName: string;
    delayBetweenIndicatorsInSeconds: number;
};

export type SquadContainerProps = TeamNameProps & MultipleSquadsProps & BaseUIProps & UpsideDownProps & EntityUpdatesProps & SyncProps;

export type EntityDisplayProps = SingleEntityProps & EntityUpdatesProps & UpsideDownProps & TransferFunctionProps;

export type SquadHeaderProps = TeamIdentityProps;

export type LocationLineProps = MultipleEntitiesProps & EntityUpdatesProps & UpsideDownProps & TransferFunctionProps & {
    title: string;
    location: SquadEntityInSquadLocation;
};

export type EntityPortraitProps = UpsideDownProps & EntityPortraitStateProps & {
    portraitImage: string;
};

export type EntityStatsProps = StatsProps;

export type SquadStatsProps = SingleSquadProps & {
    position?: UDim2;
};

export type EntityInfoProps = StatsProps & {
    name: string;
    playerID: number;
};

export type BattleHeaderProps = BaseUIProps & RoundProps;

export type BattleInfoPanelProps = SquadCollectionProps & RoundProps & {
    teamNames: string[];
};

export type TeamHeaderProps = TeamNameProps & BaseUIProps & {
    squadCount: number;
};
