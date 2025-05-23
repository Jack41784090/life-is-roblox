import { atom, Atom } from "@rbxts/charm";
import { Reality } from "shared/class/battle/types";
import { calculateRealityValue, extractMapValues } from "shared/utils";
import Logger from "shared/utils/Logger";
// import CombatEffectsService from "../../Client/Effects/CombatEffectsServices";
import { EventBus } from "../../Events/EventBus";
import { UNIVERSAL_PHYS } from "../../Systems/CombatSystem/Ability/const";
import { AbilityConfig, AbilitySet, AbilitySetDefinition, AbilityType, ActiveAbilityConfig, ActiveAbilityState } from "../../Systems/CombatSystem/Ability/types";
import Armour from "../../Systems/CombatSystem/Armour";
import { ArmourConfig } from "../../Systems/CombatSystem/Armour/types";
import FightingStyle from "../../Systems/CombatSystem/FightingStyle";
import { AGGRESSIVE_STANCE, BASIC_STANCE, DEFENSIVE_STANCE } from "../../Systems/CombatSystem/FightingStyle/const";
import Weapon from "../../Systems/CombatSystem/Weapon";
import { WeaponConfig } from "../../Systems/CombatSystem/Weapon/types";
import { EntityChangeable, EntityConfig, EntityStance, EntityState, EntityStats, EntityUpdate } from "./types";

export default class Entity {
    // server-controlled properties
    public playerID: number;
    public stats: EntityStats;
    public name: string;
    private sta: Atom<number>;
    private hip: Atom<number>;
    private org: Atom<number>;
    private pos: Atom<number>;
    private mana: Atom<number>;

    public armour: Armour;
    public weapon: Weapon;

    private stance: EntityStance = EntityStance.High;
    private logger = Logger.createContextLogger("Entity");

    qr: Vector2;
    armed?: keyof typeof Enum.KeyCode;
    team: string;

    // Fighting style properties
    private fightingStyles: FightingStyle[] = [];
    private activeStyleIndex: number = 0;

    constructor(options: EntityConfig, eventBus?: EventBus) {
        this.qr = options.qr;
        this.playerID = options.playerID;
        this.team = options.team;
        this.stats = { ...options.stats, id: options.stats.id };
        this.sta = atom(options.sta ?? 0);
        this.hip = atom(options.hip ?? 0);
        this.org = atom(options.org ?? 0);
        this.pos = atom(options.pos ?? 0);
        this.mana = atom(options.mana ?? 0);
        this.name = options.name ?? `unknown-${options.playerID}-${options.stats.id}`;
        this.weapon = options.weapon ? new Weapon(options.weapon) : Weapon.Unarmed();
        this.armour = options.armour ? new Armour(options.armour) : Armour.Unprotected();

        // Initialize with default fighting styles
        this.initializeFightingStyles(options.fightingStyles);
    }
    private initializeFightingStyles(configStyles?: FightingStyle[]) {
        // Add default fighting styles if none provided
        if (!configStyles || configStyles.size() === 0) {
            this.fightingStyles = [
                BASIC_STANCE(),
                AGGRESSIVE_STANCE(),
                DEFENSIVE_STANCE()
            ];
        } else {
            this.fightingStyles = configStyles;
        }

        this.logger.info(`${this.name} initialized with ${this.fightingStyles.size()} fighting styles`);
    }

    state(): EntityState {
        return {
            name: this.name,
            stance: this.stance,
            playerID: this.playerID,
            qr: this.qr,
            team: this.team,
            stats: {
                ...this.stats,
            },
            sta: this.sta(),
            hip: this.hip(),
            org: this.org(),
            pos: this.pos(),
            mana: this.mana(),
            weapon: this.weapon.getState(),
            armour: this.armour.getState(),
            activeStyleIndex: this.activeStyleIndex,
            fightingStyles: this.fightingStyles.map(style => style.getState())
        }
    }

    //#region get stats
    set(property: EntityChangeable, by: number) {
        this.logger.debug(`${this.name}: Changing ${property} by ${by}`);
        const oldValue = this[property]();
        this[property](math.max(0, by));


        return this[property];
    }

    get(property: EntityChangeable): number {
        return this[property]();
    }

    getState(property: EntityChangeable): Atom<number> {
        return this[property];
    }
    //#endregion

    //#region get abilities
    getAllAbilitySets(): Array<AbilitySet> {
        const availableAbilities = this.getAvailableAbilities();

        // Create a definition first
        const abilitySetDef: AbilitySetDefinition = {};

        // Populate the definition based on available abilities
        if (availableAbilities.size() >= 1) abilitySetDef.Q = availableAbilities[0];
        if (availableAbilities.size() >= 2) abilitySetDef.W = availableAbilities[1];
        if (availableAbilities.size() >= 3) abilitySetDef.E = availableAbilities[2];
        if (availableAbilities.size() >= 4) abilitySetDef.R = availableAbilities[3];        // Check if there are no keys in the ability set definition
        let isEmpty = true;
        for (const [_, __] of pairs(abilitySetDef)) {
            isEmpty = false;
            break;
        }

        if (isEmpty) {
            // Fallback to a default ability if none are available
            const defaultAbility = this.getAllAbilities().find(a => a.type === AbilityType.Active) as ActiveAbilityConfig;
            if (defaultAbility) {
                abilitySetDef.Q = defaultAbility;
            }
        }        // Convert to AbilitySet - create a fresh object to avoid readonly property issues
        const abilitySet = {} as Record<string, ActiveAbilityConfig>;
        for (const [key, value] of pairs(abilitySetDef)) {
            abilitySet[key] = value;
        }        // Cast the result to AbilitySet since we've populated it correctly
        const typedAbilitySet = abilitySet as unknown as AbilitySet;

        return [typedAbilitySet];
    }

    getAllAbilities(): Array<AbilityConfig> {
        // Get abilities from all fighting styles
        const allAbilities: AbilityConfig[] = [];

        this.fightingStyles.forEach(style => {
            style.getActiveAbilities().forEach(ability => {
                allAbilities.push(ability.getState() as ActiveAbilityConfig);
            });
        });

        // If no fighting style abilities are available, use default universal abilities
        if (allAbilities.size() === 0) {
            const uniPhysAbilities = extractMapValues(UNIVERSAL_PHYS);
            return uniPhysAbilities;
        }

        return allAbilities;
    }

    getEquippedAbilitySet() {
        const sets = this.getAllAbilitySets();
        return sets[0];
    }

    getReaction(incomingAbility: ActiveAbilityState) {
        const { direction: hittingDirection, using, target, type: abilityType } = incomingAbility;
        assert(abilityType === AbilityType.Active, `Ability ${incomingAbility.name} is not an active ability`);
        if (using === undefined) {
            this.logger.warn(`${this.name} is not able to react to ${incomingAbility.name} because it has no user`);
            return;
        }
        if (target?.playerID !== this.playerID) {
            this.logger.warn(`${this.name} is not able to react to ${incomingAbility.name} because it is not the target`);
            return;
        }

        // Get a reaction ability from the current fighting style
        const activeStyle = this.getActiveStyle();
        const reactionAbility = activeStyle.getRandomReactionAbility();

        // // If we found a reaction ability and we're on the client, show a reaction effect
        // if (reactionAbility && game.GetService("RunService").IsClient()) {
        //     const combatEffects = CombatEffectsService.getInstance();
        //     // Position the effect near the bottom of the screen
        //     const reactionPosition = new UDim2(0.5, 0, 0.8, 0);

        //     // Use a color based on the active style
        //     let effectColor: Color3;
        //     const styleName = activeStyle.getName();

        //     if (string.find(styleName, "Defensive")[0]) {
        //         effectColor = new Color3(0.2, 0.6, 1);  // Blue for defensive
        //     } else if (string.find(styleName, "Aggressive")[0]) {
        //         effectColor = new Color3(1, 0.4, 0.3);  // Red for aggressive
        //     } else {
        //         effectColor = new Color3(0.4, 0.8, 0.4);  // Green for balanced/basic
        //     }

        //     // Access the ability state to get the name safely
        //     const abilityState = reactionAbility.getState();
        //     const abilityName = (abilityState as { name?: string })?.name || "Reaction";

        //     // Show the reaction ability effect
        //     combatEffects.showAbilityReaction(
        //         reactionPosition,
        //         effectColor,
        //         abilityName
        //     );
        // }

        return reactionAbility;
    }
    //#endregion

    //#region Modifying
    public update(updates: EntityUpdate) {
        this.logger.debug(`${this.name}: Updating entity with ${updates}`);
        for (const [key, value] of pairs(updates)) {
            if (key === 'qr') {
                this.setCell(value as Vector2);
            } else if (key === 'stats') {
                this.stats = { ...this.stats, ...value as EntityStats };
            }
            else if (key === 'weapon') {
                this.weapon = new Weapon(value as WeaponConfig);
            } else if (key === 'armour') {
                this.armour = new Armour(value as ArmourConfig);
            }
            else if (key === 'hip' || key === 'sta' || key === 'org' || key === 'pos' || key === 'mana') {
                this[key] = atom(value as number);
            }
            else if (key === 'activeStyleIndex') {
                const newIndex = value as number;
                if (newIndex >= 0 && newIndex < this.fightingStyles.size()) {
                    this.activeStyleIndex = newIndex;
                } else {
                    this.logger.warn(`${this.name} tried to set active style index to ${newIndex}, but it's out of bounds`);
                }
            }
            else {
                this.logger.warn(`Unimplemented property ${key} in entity update`);
                // TODO: implement other properties
                /**
                 *   15:00:24.807  [WARN] [Entity] Unimplemented property stance in entity update  -  Client - Logger:156
                  15:00:24.807  [WARN] [Entity] Unimplemented property playerID in entity update  -  Client - Logger
                  15:00:24.807  [WARN] [Entity] Unimplemented property name in entity update  -  Client - Logger:156
                  15:00:24.807  [WARN] [Entity] Unimplemented property fightingStyles in entity update  -  Client - Logger:156
                  15:00:24.807  [WARN] [Entity] Unimplemented property team in entity update  -  Client - Logger:156
                 */
            }
        }
    }

    public changeHP(num: number) {
        this.logger.debug(`${this.name}: Changing HP by ${num}`);

        const oldHip = this.hip();
        this.hip(this.hip() + num);
        const maxHP = calculateRealityValue(Reality.HP, this.stats);
        const hpPercentage = 0.9 - math.clamp((this.hip() / maxHP) * .9, 0, .9);
        this.logger.debug(`HP percentage: ${hpPercentage}`);
    }

    public heal(num: number) {
        if (num < 0) return;
        this.changeHP(num);
    }

    public damage(num: number) {
        if (num < 0) return;
        this.changeHP(-num);

        // // Emit damage effect event
        // if (game.GetService("RunService").IsClient()) {
        //     // Get screen position from the character's position in world space
        //     const combatEffects = CombatEffectsService.getInstance();
        //     const character = game.GetService("Players").LocalPlayer?.Character;
        //     const camera = game.GetService("Workspace").CurrentCamera;

        //     if (character && camera) {
        //         // Use character root position as a fallback
        //         let worldPos = character.GetPivot().Position;

        //         // Convert world position to screen position
        //         const screenPosResult = camera.WorldToScreenPoint(worldPos);
        //         // Handle the LuaTuple result correctly
        //         const screenPos = {
        //             X: screenPosResult[0].X,
        //             Y: screenPosResult[0].Y
        //         };
        //         const viewportSize = camera.ViewportSize;

        //         // Calculate position as UDim2 (percentage of screen)
        //         const posX = screenPos.X / viewportSize.X;
        //         const posY = screenPos.Y / viewportSize.Y;


        //         // Create the damage effect
        //         combatEffects.showDamage(UDim2.fromScale(posX, posY), num);
        //         combatEffects.showHitImpact(UDim2.fromScale(posX, posY), new Color3(1, 0.4, 0.2), 120);
        //     }
        // }
    }

    public setCell(q: number, r: number): void;
    public setCell(qr: Vector2): void
    public setCell(q: number | Vector2, r?: number) {
        if (typeOf(q) === 'number') {
            this.qr = new Vector2(q as number, r as number);
        } else {
            this.qr = q as Vector2;
        }
    }
    //#endregion

    //#region Fighting Style Methods
    public getActiveStyle(): FightingStyle {
        return this.fightingStyles[this.activeStyleIndex];
    }

    public getFightingStyles(): FightingStyle[] {
        return [...this.fightingStyles];
    }

    public switchFightingStyle(styleIndex: number): boolean {
        if (styleIndex < 0 || styleIndex >= this.fightingStyles.size() || styleIndex === this.activeStyleIndex) {
            this.logger.warn(`${this.name} cannot switch to fighting style ${styleIndex}: invalid index`);
            return false;
        }

        const newStyle = this.fightingStyles[styleIndex];
        const switchCost = newStyle.getSwitchCost();

        // Check if entity has enough posture to switch
        if (this.pos() < switchCost) {
            this.logger.warn(`${this.name} cannot switch to ${newStyle.getName()}: not enough posture (${this.pos()} < ${switchCost})`);
            return false;
        }

        // Pay the posture cost
        this.set('pos', this.pos() - switchCost);

        // Switch to new style
        this.activeStyleIndex = styleIndex;
        this.logger.info(`${this.name} switched to fighting style: ${newStyle.getName()}`);

        // // Create visual effect for style switching
        // if (game.GetService("RunService").IsClient()) {
        //     // Determine the color based on the style (can be customized based on style properties)
        //     let effectColor: Color3;
        //     const styleName = newStyle.getName();

        //     if (string.find(styleName, "Defensive")[0]) {
        //         effectColor = new Color3(0.2, 0.6, 1);  // Blue for defensive
        //     } else if (string.find(styleName, "Aggressive")[0]) {
        //         effectColor = new Color3(1, 0.4, 0.3);  // Red for aggressive
        //     } else {
        //         effectColor = new Color3(0.4, 0.8, 0.4);  // Green for balanced/basic
        //     }

        //     // Position the effect in the center of the screen for maximum visibility
        //     const centerPosition = new UDim2(0.5, 0, 0.5, 0);

        //     // Show style switch effect
        //     const i = CombatEffectsService.getInstance();
        //     i.showStyleSwitch(centerPosition, effectColor);
        // }

        return true;
    }

    public useAbility(abilityName: string) {
        const activeStyle = this.getActiveStyle();
        const ability = activeStyle.useAbility(abilityName);

        if (!ability) {
            this.logger.warn(`${this.name} failed to use ability ${abilityName}`);
            return undefined;
        }

        // Apply ability costs
        const abilityCost = ability.getState().cost;
        for (const [stat, cost] of pairs(abilityCost)) {
            if (this[stat]) {
                this.set(stat as EntityChangeable, this.get(stat as EntityChangeable) - cost);
            }
        }

        // Create visual effect for ability usage
        if (game.GetService("RunService").IsClient()) {
            // Get ability color based on the ability's properties
            const abilityState = ability.getState();
            let effectColor: Color3;

            // Determine color based on ability name since the category field doesn't exist
            const abilityNameLower = string.lower(abilityName);

            // Customize color based on naming conventions or other properties
            if (string.find(abilityNameLower, "attack")[0] ||
                string.find(abilityNameLower, "strike")[0] ||
                string.find(abilityNameLower, "slash")[0]) {
                effectColor = new Color3(0.9, 0.3, 0.2);  // Red for offensive abilities
            } else if (string.find(abilityNameLower, "block")[0] ||
                string.find(abilityNameLower, "defend")[0] ||
                string.find(abilityNameLower, "guard")[0]) {
                effectColor = new Color3(0.2, 0.6, 0.9);  // Blue for defensive abilities
            } else if (string.find(abilityNameLower, "dash")[0] ||
                string.find(abilityNameLower, "move")[0] ||
                string.find(abilityNameLower, "jump")[0]) {
                effectColor = new Color3(0.7, 0.5, 0.9);  // Purple for movement abilities
            } else {
                effectColor = new Color3(0.9, 0.7, 0.2);  // Gold for other abilities
            }

            // Show ability effect at the top portion of the screen
            const abilityPosition = new UDim2(0.5, 0, 0.2, 0);

            // Just use the ability name directly since displayName doesn't exist
            const displayName = abilityState.name || abilityName;

            // Show ability use effect
            // CombatEffectsService.getInstance().showAbilityUse(abilityPosition, effectColor, displayName);
        }

        this.logger.info(`${this.name} used ability ${abilityName}`);
        return ability;
    }

    public getAvailableAbilities(): ActiveAbilityConfig[] {
        const activeStyle = this.getActiveStyle();
        return activeStyle.getAvailableAbilities().map(ability => ability.getState() as ActiveAbilityConfig);
    }

    public recycleAbilities(): void {
        const activeStyle = this.getActiveStyle();
        activeStyle.recycleAbilities();
        this.logger.info(`${this.name} recycled all abilities for style: ${activeStyle.getName()}`);
    }
    //#endregion
}