import { EntityUpdate } from '../../../squad-battle/type';
export enum IndicatorType {
    Damage,
    Heal,
    Retreat,
    Death,
    Advance,
    Null,
    Clink,
    Dodge,
}

export interface ProtoIndicator {
    T: IndicatorType;
    ref: EntityUpdate,
    id: number;
    value: number;
    position: UDim2;
    atSecond: number;
    onComplete?: () => void;
    animationTrigger?: string;
    barSyncData?: {
        type: string;
        newValue: number;
        maxValue: number;
    };
}

export type EntityUpdateIndicator =
    EntityUpdate & {
        atSecond: number,
        onComplete?: () => void
    };
