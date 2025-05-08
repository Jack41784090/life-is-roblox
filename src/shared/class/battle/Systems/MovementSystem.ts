// import { EventBus } from "../Events/EventBus";
// import State from "../State/State";
// import { GridManager } from "../State/Managers/GridManager";

// export interface Result<T, E> {
//     success: boolean;
//     value?: T;
//     error?: E;
// }

// export class MovementSystem {
//     constructor(
//         private gameState: State,
//         private gridManager: GridManager,
//         private eventBus: EventBus
//     ) { }

//     public moveEntity(entityId: number, destination: Vector2): Result<void, string> {
//         // ...implementation...
//     }

//     public canMoveTo(entityId: number, destination: Vector2): boolean {
//         // ...implementation...
//     }

//     public getValidMovementDestinations(entityId: number): Vector2[] {
//         // ...implementation...
//     }

//     public calculateMovementCost(from: Vector2, to: Vector2): number {
//         // ...implementation...
//     }
// }
