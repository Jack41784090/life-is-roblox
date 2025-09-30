import { EntityUpdate } from '../../../squad-battle/type';
export enum IndicatorType {
    Damage,
    Heal,
    Retreat,
    Death,
}

export interface ProtoIndicator {
    T: IndicatorType;
    id: number;
    value: number;
    position: UDim2;
    atSecond: number;
}

export type EntityUpdateIndicator =
    EntityUpdate & { atSecond: number };
