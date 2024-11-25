import { atom, effect } from "@rbxts/charm";
import { Collection, createCollection } from "@rbxts/lapis";
import { Players } from "@rbxts/services";
import { t } from "@rbxts/t";
import { PlayerData } from "shared/types";
import { EntityStats } from "shared/types/battle-types";
import { flattenAtoms, getDummyStats } from "shared/utils";


export class Database {
    private static instance: Database;
    public static Get() {
        if (Database.instance === undefined) {
            Database.instance = new Database();
        }
        return this.instance;
    }
    public static Read() {
        const d = this.Get();
        return d.datastore;
    }
    public static GlobalAtoms() {
        const ds = this.Read();
        return flattenAtoms({
            ds
        })
    }

    private Characters: Collection<EntityStats>;
    private Players: Collection<PlayerData>;

    private constructor() {
        const characterStatsDefault = getDummyStats();
        this.Characters = createCollection("characterStats", {
            defaultData: characterStatsDefault,
            validate: t.interface({
                id: t.string,
                str: t.number,
                dex: t.number,
                acr: t.number,
                spd: t.number,
                siz: t.number,
                int: t.number,
                spr: t.number,
                fai: t.number,
                cha: t.number,
                beu: t.number,
                wil: t.number,
                end: t.number,
            })
        })

        const playerDataDefault = {
            money: 0
        }
        this.Players = createCollection("playerData", {
            defaultData: playerDataDefault,
            validate: t.interface({
                money: t.number
            })
        })
    }

    private datastore = {
        players: atom<PlayerDataMap>({}),
        characters: atom<CharacterStatsMap>({}),
        activeSessions: atom<ActiveSessionMap>({}),
    };

    //#region Active Sessions Database

    getActiveSession(id: string) {
        return this.datastore.activeSessions()[id];
    }

    setActiveSession(id: string, session: Online) {
        this.datastore.activeSessions((state) => ({
            ...state,
            [id]: session,
        }));
    }

    deleteActiveSession(id: string) {
        this.datastore.activeSessions((state) => ({
            ...state,
            [id]: undefined,
        }));
    }

    updateActiveSession(id: string, updater: (session: Online) => Online) {
        this.datastore.activeSessions((state) => ({
            ...state,
            [id]: state[id] && updater(state[id]),
        }));
    }


    //#endregion

    //#region Player Database
    getPlayerData(id: string) {
        return this.datastore.players()[id];
    }

    setPlayerData(id: string, playerData: PlayerData) {
        this.datastore.players((state) => ({
            ...state,
            [id]: playerData,
        }));
        print(this.datastore.players());
    }

    deletePlayerData(id: string) {
        this.datastore.players((state) => ({
            ...state,
            [id]: undefined,
        }));
    }

    updatePlayerData(id: string, updater: (data: PlayerData) => PlayerData) {
        this.datastore.players((state) => ({
            ...state,
            [id]: state[id] && updater(state[id]),
        }));
    }

    async loadPlayerData(player: Player) {
        const id = player.UserId;
        const id_string = `${id}`;
        const document = await this.Players.load(id_string, [id]);

        if (!player.IsDescendantOf(Players)) {
            document.close();
            return;
        }

        const unsubscribe = effect(() => {
            const data = this.getPlayerData(id_string);
            if (data) {
                document.write(data);
            }
        });

        this.setPlayerData(id_string, document.read());

        Promise.fromEvent(Players.PlayerRemoving, (left) => player === left)
            .then(() => unsubscribe())
            .then(() => document.close());
    }
    //#endregion
}
const atoms = Database.GlobalAtoms();
export type GlobalAtoms = typeof atoms;

type CharacterStatsMap = {
    readonly [K in string]?: EntityStats;
};

type PlayerDataMap = {
    readonly [K in string]?: PlayerData;
};

type ActiveSessionMap = {
    readonly [K in string]?: Online
};
