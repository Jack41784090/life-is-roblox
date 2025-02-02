import FightingStyle from ".";
import { EntityStance } from "../Entity/types";

export const Default = () => new FightingStyle({
    reactionAbilities: [{
        animation: 'block',
        name: 'Block',
        description: 'Block incoming attacks',
        icon: 'block',

        direction: EntityStance.High,
        chance: 100,
        cost: {
            pos: 10,
            mana: 0,
        }
    }],
})
