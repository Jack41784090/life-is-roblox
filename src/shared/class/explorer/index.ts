import { PlaceName } from "shared/const";
import Place from "./Place";

export default class Explorer {
    private static instance: Explorer;

    public static getInstance(): Explorer {
        if (!Explorer.instance) {
            Explorer.instance = new Explorer();
        }
        return Explorer.instance;
    }

    private exploring?: Place;
    private location: string = 'home';
    private mainCharacter: string = 'entity_adalbrecht'

    private constructor() { }

    public beginExplore(placeName: PlaceName) {
        this.location = placeName;
        this.exploring = Place.GetPlace(placeName);
        this.exploring.spawnNPCs();
    }
}