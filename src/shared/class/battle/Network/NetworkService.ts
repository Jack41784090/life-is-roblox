import { SyncPayload } from "@rbxts/charm-sync";
import { RunService } from "@rbxts/services";
import { GuiTag } from "shared/const";
import { GlobalAtoms } from "shared/datastore";
import remotes from "shared/remote";
import { AccessToken, Config, HexGridState, StateState, TeamState } from "shared/types/battle-types";

/**
 * NetworkService - Abstracts all remote event communication
 * This service handles all network communication between client and server
 * providing a clean interface for other classes to use
 */
export class NetworkService {
    // Store cleanup functions for remote connections
    private readonly connections: (() => void)[] = [];

    constructor() {
        this.initializeEventHandlers();
    }

    private initializeEventHandlers() {
        if (RunService.IsClient()) {
            // Set up client-side event handlers - connections are stored for cleanup
            this.connections.push(
                remotes.battle.animate.connect((action) => {
                    // Remote handlers will directly notify subscribers through callbacks
                    this.actionAnimateCallbacks.forEach(callback => callback(action));
                }),

                remotes.battle.forceUpdate.connect(() => {
                    this.forceUpdateCallbacks.forEach(callback => callback());
                }),

                remotes.battle.chosen.connect(() => {
                    this.turnChangedCallbacks.forEach(callback => {
                        callback({ entityId: 0 }); // Need to get actual entityId here
                    });
                })
            );
        }
    }

    // Callback storage for subscribers
    private readonly entityMovedCallbacks: ((data: { entityId: number, from: Vector2, to: Vector2 }) => void)[] = [];
    private readonly turnChangedCallbacks: ((data: { entityId: number }) => void)[] = [];
    private readonly actionAnimateCallbacks: ((action: AccessToken) => void)[] = [];
    private readonly forceUpdateCallbacks: (() => void)[] = [];

    // Event subscriptions
    public onEntityMoved = (callback: (data: { entityId: number, from: Vector2, to: Vector2 }) => void): (() => void) => {
        this.entityMovedCallbacks.push(callback);
        return () => {
            const index = this.entityMovedCallbacks.indexOf(callback);
            if (index !== -1) this.entityMovedCallbacks.remove(index);
        };
    };

    public onTurnChanged = (callback: (data: { entityId: number }) => void): (() => void) => {
        this.turnChangedCallbacks.push(callback);
        return () => {
            const index = this.turnChangedCallbacks.indexOf(callback);
            if (index !== -1) this.turnChangedCallbacks.remove(index);
        };
    };

    public onActionAnimate = (callback: (action: AccessToken) => void): (() => void) => {
        this.actionAnimateCallbacks.push(callback);
        return () => {
            const index = this.actionAnimateCallbacks.indexOf(callback);
            if (index !== -1) this.actionAnimateCallbacks.remove(index);
        };
    };

    public onForceUpdate = (callback: () => void): (() => void) => {
        this.forceUpdateCallbacks.push(callback);
        return () => {
            const index = this.forceUpdateCallbacks.indexOf(callback);
            if (index !== -1) this.forceUpdateCallbacks.remove(index);
        };
    };

    // Remote calls (client to server)
    public async requestRoom() {
        if (RunService.IsClient()) {
            return remotes.battle.requestRoom();
        }
    }

    public async requestGridState(): Promise<HexGridState> {
        if (RunService.IsClient()) {
            return remotes.battle.requestSync.map();
        }
        throw "Cannot call requestGridState on server";
    }

    public async requestTeamState(): Promise<TeamState[]> {
        if (RunService.IsClient()) {
            return remotes.battle.requestSync.team();
        }
        throw "Cannot call requestTeamState on server";
    }

    public async requestGameState(): Promise<StateState> {
        if (RunService.IsClient()) {
            return remotes.battle.requestSync.state();
        }
        throw "Cannot call requestGameState on server";
    }

    public async requestToAct(): Promise<AccessToken> {
        if (RunService.IsClient()) {
            return remotes.battle.requestToAct();
        }
        throw "Cannot call requestToAct on server";
    }

    public async performAction(action: AccessToken): Promise<AccessToken> {
        if (RunService.IsClient()) {
            return remotes.battle.act(action);
        }
        throw "Cannot call performAction on server";
    }

    public async endTurn(access: AccessToken) {
        if (RunService.IsClient()) {
            return remotes.battle.end(access);
        }
        throw "Cannot call endTurn on server";
    }

    // Methods required by Battle class
    public onGridStateRequest(handler: (player: Player) => HexGridState) {
        if (RunService.IsServer()) {
            remotes.battle.requestSync.map.onRequest((player) => {
                return handler(player);
            });
        }
    }

    public onTeamStateRequest(handler: (player: Player) => TeamState[]) {
        if (RunService.IsServer()) {
            remotes.battle.requestSync.team.onRequest((player) => {
                return handler(player);
            });
        }
    }

    public onGameStateRequest(handler: (player: Player) => StateState) {
        if (RunService.IsServer()) {
            remotes.battle.requestSync.state.onRequest((player) => {
                return handler(player);
            });
        }
    }

    public onActRequest(handler: (player: Player) => AccessToken) {
        if (RunService.IsServer()) {
            remotes.battle.requestToAct.onRequest((player) => {
                return handler(player);
            });
        }
    }

    public onActionExecution(handler: (player: Player, access: AccessToken) => AccessToken): void {
        if (RunService.IsServer()) {
            remotes.battle.act.onRequest((player, access) => {
                return handler(player, access);
            });
        }
    }

    public onTurnEnd(handler: (player: Player, access: AccessToken) => boolean): Promise<Player> {
        if (RunService.IsServer()) {
            return new Promise<Player>((resolve) => {
                remotes.battle.end.connect((player, access) => {
                    if (handler(player, access)) {
                        resolve(player);
                    }
                });
            });
        }
        throw "Cannot call onTurnEnd on client";
    }

    public notifyPlayerChosen(player: Player) {
        if (RunService.IsServer()) {
            remotes.battle.chosen(player);
        }
    }

    public forceClientUpdate(player: Player) {
        if (RunService.IsServer()) {
            remotes.battle.forceUpdate(player);
        }
    }

    public sendAnimationToPlayer(player: Player, action: AccessToken) {
        if (RunService.IsServer()) {
            remotes.battle.animate(player, action);
        }
    }

    public sendEntityMoved(player: Player, data: { entityId: number, from: Vector2, to: Vector2 }): void {
        if (RunService.IsServer()) {
            // If there was a remote event for entity movement, you would fire it here
            // For now, we'll use the force update mechanism
            this.forceClientUpdate(player);

            // Notify subscribers on the receiving end
            this.entityMovedCallbacks.forEach(callback => callback(data));
        }
    }

    // UI-related remotes
    public unmountUI(tag: GuiTag) {
        if (RunService.IsServer()) {
            remotes.battle.ui.unmount.fireAll(tag);
        }
    }

    public mountActionMenu(player: Player) {
        if (RunService.IsServer()) {
            remotes.battle.ui.mount.actionMenu(player);
        }
    }

    public mountOtherPlayersTurn(player: Player) {
        if (RunService.IsServer()) {
            remotes.battle.ui.mount.otherPlayersTurn(player);
        }
    }

    public createClientBattle(player: Player, config: Partial<Config>) {
        if (RunService.IsServer()) {
            remotes.battle.createClient(player, config);
        }
    }

    // General game remotes
    public loadCharacter() {
        if (RunService.IsClient()) {
            return remotes.loadCharacter();
        }
    }

    public async requestData(storeName: string, key: string) {
        if (RunService.IsClient()) {
            return remotes.requestData(storeName, key);
        }
        throw "Cannot call requestData on server";
    }

    public init() {
        if (RunService.IsClient()) {
            return remotes.init();
        }
    }

    public sync(payload: SyncPayload<GlobalAtoms>) {
        if (RunService.IsServer()) {
            remotes.sync.fireAll(payload);
        }
    }

    // Cleanup method
    public destroy() {
        this.connections.forEach(disconnect => disconnect());
        this.connections.clear();

        this.entityMovedCallbacks.clear();
        this.turnChangedCallbacks.clear();
        this.actionAnimateCallbacks.clear();
        this.forceUpdateCallbacks.clear();
    }
}
