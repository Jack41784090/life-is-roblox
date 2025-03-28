// import { AttackAction, ClashResult } from "shared/types/battle-types";
// import { EventBus } from "../Events/EventBus";
// import { AbilityState } from "../State/Ability/types";
// import { EntityState } from "../State/Entity/types";
// import { GameState } from "../State/GameState";

// interface HitResult {
//     hitRoll: number;
//     hitChance: number;
//     critChance: number;
// }

// export class CombatSystem {
//     constructor(
//         private gameState: GameState,
//         private eventBus: EventBus
//     ) { }

//     public resolveAttack(action: AttackAction): ClashResult {
//         // ...implementation...
//     }

//     public calculateDamage(attacker: EntityState, target: EntityState, ability: AbilityState): number {
//         // ...implementation...
//     }

//     public applyDamage(targetId: number, amount: number): void {
//         // ...implementation...
//     }

//     private rollHit(accuracy: number, attacker: EntityState, defender: EntityState): HitResult {
//         // ...implementation...
//     }
// }
