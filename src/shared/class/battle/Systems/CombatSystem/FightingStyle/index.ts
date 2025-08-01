import Logger from "shared/utils/Logger";
import { ActiveAbility, ReactiveAbility } from "../Ability";
import { FightingStyleConfig, FightingStylePassiveEffect, FightingStyleState, PassiveEffectType } from "./type";

export default class FightingStyle {
    private logger = Logger.createContextLogger("FightingStyle");
    private readonly name: string;
    private readonly description: string;
    private readonly activeAbilities: ActiveAbility[];
    private readonly reactionAbilities: ReactiveAbility[];
    private readonly passiveEffects: FightingStylePassiveEffect[];
    private readonly switchCost: number;

    private availableAbilities: ActiveAbility[] = [];
    private usedAbilities: ActiveAbility[] = [];

    constructor(config: FightingStyleConfig) {
        this.name = config.name;
        this.description = config.description;
        this.activeAbilities = config.activeAbilities.map((abilityConfig) => new ActiveAbility(abilityConfig));
        this.reactionAbilities = config.reactionAbilities.map((abilityConfig) => new ReactiveAbility(abilityConfig));
        this.passiveEffects = config.passiveEffects;
        this.switchCost = config.switchCost;

        // Initialize all abilities as available
        this.resetAbilities();


    }

    public getName(): string {
        return this.name;
    }

    public getDescription(): string {
        return this.description;
    }

    public getSwitchCost(): number {
        return this.switchCost;
    }

    public getActiveAbilities(): ActiveAbility[] {
        return [...this.activeAbilities];
    }

    public getAvailableAbilities(): ActiveAbility[] {
        return [...this.availableAbilities];
    }

    public getUsedAbilities(): ActiveAbility[] {
        return [...this.usedAbilities];
    }

    public getPassiveEffects(): FightingStylePassiveEffect[] {
        return [...this.passiveEffects];
    }

    public getRandomReactionAbility(): ReactiveAbility {
        return this.reactionAbilities[math.floor(math.random() * this.reactionAbilities.size())];
    }

    public useAbility(abilityName: string): ActiveAbility | undefined {
        const abilityIndex = this.availableAbilities.findIndex(ability =>
            ability.getState().name === abilityName);

        if (abilityIndex === -1) {
            this.logger.warn(`Ability ${abilityName} is not available in fighting style ${this.name}`);
            return undefined;
        }

        const ability = this.availableAbilities[abilityIndex];

        // Remove from available and add to used
        this.availableAbilities.remove(abilityIndex);
        this.usedAbilities.push(ability);

        // If no more abilities are available, recycle them
        if (this.availableAbilities.size() === 0) {
            this.recycleAbilities();
        }

        return ability;
    }

    public getAbility(abilityName: string): ActiveAbility | undefined {
        return this.activeAbilities.find(ability => ability.getState().name === abilityName);
    }

    public recycleAbilities(): void {
        this.resetAbilities();
    }

    public resetAbilities(): void {
        this.availableAbilities = [...this.activeAbilities];
        this.usedAbilities = [];
    }

    public getPassiveEffectValue(effectType: PassiveEffectType): number {
        const effect = this.passiveEffects.find(e => e.type === effectType);
        return effect ? effect.value : 0;
    }

    public getState(): FightingStyleState {
        return {
            name: this.name,
            description: this.description,
            availableAbilities: this.availableAbilities.map(a => a.getState().name),
            usedAbilities: this.usedAbilities.map(a => a.getState().name),
            passiveEffects: this.passiveEffects
        };
    }

    // public clone(): FightingStyle {
    //     const cloned = new FightingStyle({
    //         name: this.name,
    //         description: this.description,
    //         activeAbilities: this.activeAbilities.map(a => a.getState()),
    //         reactionAbilities: this.reactionAbilities.map(a => a.getState()),
    //         passiveEffects: [...this.passiveEffects],
    //         switchCost: this.switchCost
    //     });
    //     return cloned;
    // }
}
