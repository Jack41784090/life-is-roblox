import Place from "..";

export const DEBUG_PORTALS = true;

export type IndoorLocationName = string;

export interface IndoorLocationConfig {
    locationName: IndoorLocationName;
    entranceLocation: Vector3;
    parentPlace: Place;
}

