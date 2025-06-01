import { SyncPayload } from "@rbxts/charm-sync";
import { Client, createRemotes, loggerMiddleware, namespace, remote, Server } from "@rbxts/remo";
import { t } from "@rbxts/t";
import { EntityState } from "shared/class/battle/State/Entity/types";
import { StrikeSequence, TriggerModify } from "shared/class/battle/Systems/CombatSystem/types";
import { AccessToken, ActionType, AttackAction, BattleConfig, HexGridState, StateState, TeamState } from "shared/class/battle/types";
import { GuiTag } from "shared/const";
import { GlobalAtoms } from "shared/datastore";
import Logger from "shared/utils/Logger";

const remoteLogger = Logger.createContextLogger("Remotes")

const remotes = createRemotes({
    loadCharacter: remote<Server>(),

    init: remote<Server>(),
    sync: remote<Client, [payload: SyncPayload<GlobalAtoms>]>(),
}, loggerMiddleware)

export const serverRemotes = createRemotes({
    startBattle: remote<Server, [arg: Player[]]>(),
    requestRoom: remote<Server>(),
    request: remote<Server>(),
    end: remote<Server, [access: AccessToken]>(),

    room: namespace({
        setReady: remote<Server, [isReady: boolean]>(),
        leave: remote<Server>(),
        kick: remote<Server, [playerId: number]>(),
    }),
});

export const serverRequestRemote = createRemotes({
    clashes: remote<Server, [attackAction: AccessToken]>().returns<(StrikeSequence | TriggerModify)[]>(),
    map: remote<Server>().returns<HexGridState>(),
    team: remote<Server>().returns<TeamState[]>(),
    state: remote<Server>().returns<StateState>(),
    actor: remote<Server, [actorID: number]>().returns<EntityState | undefined>(),
    cre: remote<Server>().returns<number>(),
    toAct: remote<Server>().returns<AccessToken>(t.interface({
        userId: t.number,
        allowed: t.boolean,
        token: t.optional(t.string),
        action: t.optional(
            t.interface({
                type: t.literal(ActionType.Move, ActionType.Attack),
                by: t.number,
                against: t.optional(t.number),
                executed: t.boolean,
            })),
    })),
    act: remote<Server, [action: AccessToken]>().returns<AccessToken>(),
})

export const clientRemotes = createRemotes({        //#region Server => Client
    tickLocalGauntlet: remote<Client>(),
    chosen: remote<Client>(),
    forceUpdate: remote<Client>(),
    animate: remote<Client, [action: AccessToken]>(),
    // camera: namespace({
    //     hoi4: remote<Client>(),
    // }),
    animateClashes: remote<Client, [clashes: StrikeSequence, attackActionRef: AttackAction]>(), ui: namespace({
        unmount: remote<Client, [tag: GuiTag]>(),
        startRoom: remote<Client, [arg: Player[]]>(),
        updateRoom: remote<Client, [players: Player[], readyStates: Array<[number, boolean]>]>(),
        mount: namespace({
            actionMenu: remote<Client>(),
            otherPlayersTurn: remote<Client>(),
        })
    }),
    createClient: remote<Client, [config: Partial<BattleConfig>]>(),
    turnStart: remote<Client>(),
    turnEnd: remote<Client, [id?: number]>(),
});

// export const effectsRemotes = namespace({
//     showDamage: remote<Client, [position: UDim2, damage: number]>(),
//     showStyleSwitch: remote<Client, [position: UDim2, color: Color3]>(),
//     showAbilityReaction: remote<Client, [position: UDim2, color: Color3, abilityName: string]>(),
//     showHitImpact: remote<Client, [position: UDim2, color: Color3, impactSize: number]>(),
//     showAbilityUse: remote<Client, [position: UDim2, color: Color3, abilityName: string]>()
// });

export default remotes;