import { ReactiveAbility } from "../Ability";
import { FightingStyleConfig } from "./type";

export default class FightingStyle {
    private reactionAbilities: ReactiveAbility[];

    constructor(config: FightingStyleConfig) {
        this.reactionAbilities = config.reactionAbilities.map((abilityConfig) => new ReactiveAbility(abilityConfig));
    }

    public getRandomReactionAbility(): ReactiveAbility {
        return this.reactionAbilities[math.floor(math.random() * this.reactionAbilities.size())];
    }
}
