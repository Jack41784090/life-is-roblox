// import { StateState } from "shared/types/battle-types";
// import { EventBus } from "../Events/EventBus";
// import { EntityMovedEventData, GameState } from "../State/GameState";
// import { NetworkService } from "./NetworkService";

// export class SyncSystem {
//     constructor(
//         private gameState: GameState,
//         private networkService: NetworkService,
//         private eventBus: EventBus
//     ) { }

//     public initialize(): void {
//         // Set up event listeners for state changes
//         this.gameState.onEntityMoved.connect(this.broadcastEntityMove);
//     }

//     private broadcastEntityMove(data: EntityMovedEventData): void {
//         // ...implementation...
//     }

//     public syncClientState(player: Player): void {
//         // ...implementation...
//     }

//     public applyStateUpdate(update: Partial<StateState>): void {
//         // ...implementation...
//     }
// }
