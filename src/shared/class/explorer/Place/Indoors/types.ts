import Place from "..";

export type IndoorLocationName = 'entrance1'

export interface IndoorLocationConfig {
    locationName: IndoorLocationName;
    entranceLocation: Vector3;
    parentPlace?: Place,
}
