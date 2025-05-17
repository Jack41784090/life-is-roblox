import { SyncPayload } from "@rbxts/charm-sync";
import { Client, createRemotes, loggerMiddleware, namespace, remote, Server } from "@rbxts/remo";
import { t } from "@rbxts/t";
import { AccessToken, ActionType, AttackAction, BattleConfig, HexGridState, NeoClashResult, StateState, TeamState } from "shared/class/battle/types";
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
    // #region Client => Server
    startBattle: remote<Server, [arg: Player[]]>(),
    requestRoom: remote<Server>(),
    request: remote<Server>(),
    end: remote<Server, [access: AccessToken]>(), //#endregion
});

export const serverRequestRemote = createRemotes({
    clashes: remote<Server, [attackAction: AccessToken]>().returns<NeoClashResult[]>(),
    map: remote<Server>().returns<HexGridState>(),
    team: remote<Server>().returns<TeamState[]>(),
    state: remote<Server>().returns<StateState>(),
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
    animateClashes: remote<Client, [clashes: NeoClashResult[], attackActionRef: AttackAction]>(),
    ui: namespace({
        unmount: remote<Client, [tag: GuiTag]>(),
        startRoom: remote<Client, [arg: Player[]]>(),
        mount: namespace({
            actionMenu: remote<Client>(),
            otherPlayersTurn: remote<Client>(),
        })
    }),
    createClient: remote<Client, [config: Partial<BattleConfig>]>(),
    turnStart: remote<Client>(),
    turnEnd: remote<Client, [id?: number]>(),
});

export default remotes;