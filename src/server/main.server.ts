import { Players } from "@rbxts/services";
import BattleServer from "shared/class/battle/Server";
import HexGrid from "shared/class/battle/State/Hex/Grid";
import { DEFAULT_HEIGHT, DEFAULT_WIDTH, DEFAULT_WORLD_CENTER, TeamMap } from "shared/class/battle/types";
import { GuiTag } from "shared/const";
import remotes, { clientRemotes, serverRemotes } from "shared/remote";
import { disableCharacter, enableCharacter, extractMapValues } from "shared/utils";

Players.PlayerAdded.Connect((player) => {
    print(`Player ${player.Name} has joined the game!`);
    player.CharacterAppearanceLoaded.Connect((character) => {
        disableCharacter(character);

        // Listen for the remote event to re-enable interactivity
        const cu = remotes.loadCharacter.connect((requestingPlayer) => {
            if (requestingPlayer === player) {
                enableCharacter(character);
                cu();
            }
        });
    });
});


const hexGrid = new HexGrid({
    radius: 5,
    center: new Vector2(15, 15),
    size: 10,
    name: "FunGrid"
});
// hexGrid.materialise();

serverRemotes.request.connect((p) => {
    print("Battle Start", p);

    const teamMap = room.players;
    const players = extractMapValues(teamMap);

    if (players.size() < 2) {
        players.push([p]);
        teamMap[p.Name] = [p];
    }

    players.forEach(_p => {
        _p.forEach(p => {
            clientRemotes.ui.unmount(p, GuiTag.WaitingRoom);
        });
    });
    BattleServer.Create({
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        worldCenter: DEFAULT_WORLD_CENTER,
        teamMap: teamMap,
    })
})

const room: {
    players: TeamMap;
    readyStates: Map<number, boolean>;
    hostUserId?: number;
} = {
    players: {},
    readyStates: new Map(),
}

// TEMPORARY: Set to false to restore individual room behavior
const TEMP_GLOBAL_ROOM_ENABLED = true;

serverRemotes.requestRoom.connect(p => {
    print("Battle Request Room", p);

    if (TEMP_GLOBAL_ROOM_ENABLED) {
        if (!room.hostUserId) {
            room.hostUserId = p.UserId;
        }

        room.players[p.Name] = [p];
        room.readyStates.set(p.UserId, false);

        const allPlayers: Player[] = [];
        for (const players of extractMapValues(room.players)) {
            players.forEach(player => allPlayers.push(player));
        }

        allPlayers.forEach(player => {
            clientRemotes.ui.startRoom.fire(player, allPlayers);
            const tuplesArray: Array<[number, boolean]> = [];
            for (const [userId, isReady] of room.readyStates) {
                tuplesArray.push([userId, isReady]);
            }
            clientRemotes.ui.updateRoom.fire(player, allPlayers, tuplesArray);
        });
    } else {
        if (!room.hostUserId) {
            room.hostUserId = p.UserId;
        }

        room.players[p.Name] = [p];
        room.readyStates.set(p.UserId, false);

        for (const players of extractMapValues(room.players)) {
            print("Starting room for player", players);
            players.forEach(player => {
                clientRemotes.ui.startRoom.fire(player, players);
                const tuplesArray: Array<[number, boolean]> = [];
                for (const [userId, isReady] of room.readyStates) {
                    tuplesArray.push([userId, isReady]);
                }
                clientRemotes.ui.updateRoom.fire(player, players, tuplesArray);
            });
        }
    }
});

serverRemotes.room.setReady.connect((player, isReady) => {
    print(`Player ${player.Name} ready state: ${isReady}`);
    room.readyStates.set(player.UserId, isReady);

    const readyArray: Array<[number, boolean]> = [];
    room.readyStates.forEach((ready, userId) => {
        readyArray.push([userId, ready]);
    });

    if (TEMP_GLOBAL_ROOM_ENABLED) {
        const allPlayers: Player[] = [];
        for (const players of extractMapValues(room.players)) {
            players.forEach(p => allPlayers.push(p));
        }
        allPlayers.forEach(p => {
            clientRemotes.ui.updateRoom.fire(p, allPlayers, readyArray);
        });
    } else {
        for (const players of extractMapValues(room.players)) {
            players.forEach(p => {
                clientRemotes.ui.updateRoom.fire(p, players, readyArray);
            });
        }
    }
});

serverRemotes.room.leave.connect(player => {
    print(`Player ${player.Name} left the room`);

    if (room.players[player.Name]) {
        delete room.players[player.Name];
        room.readyStates.delete(player.UserId);

        if (room.hostUserId === player.UserId) {
            const remainingPlayers = extractMapValues(room.players);
            if (remainingPlayers.size() > 0) {
                room.hostUserId = remainingPlayers[0][0].UserId;
            } else {
                room.hostUserId = undefined;
            }
        }

        const readyArray: Array<[number, boolean]> = [];
        room.readyStates.forEach((ready, userId) => {
            readyArray.push([userId, ready]);
        });

        if (TEMP_GLOBAL_ROOM_ENABLED) {
            const allPlayers: Player[] = [];
            for (const players of extractMapValues(room.players)) {
                players.forEach(p => allPlayers.push(p));
            }
            allPlayers.forEach(p => {
                clientRemotes.ui.updateRoom.fire(p, allPlayers, readyArray);
            });
        } else {
            for (const players of extractMapValues(room.players)) {
                players.forEach(p => {
                    clientRemotes.ui.updateRoom.fire(p, players, readyArray);
                });
            }
        }
    }
});

// find all cells and change height
// wait(3)
// const grid = new Grid({ widthheight: new Vector2(10, 10), center: new Vector2(0, 0), size: 10, name: "FunGrid" });
// grid.materialise()
// function iterate() {
//     const mappedCells = grid.cells.map(cell => {
//         return cell.raiseHeight(math.random(1, 10))
//     })
//     Promise.all(mappedCells)
//         .then(() => iterate())
//         .catch((err: unknown) => {
//             print("Error: " + err);
//         });
// }
// iterate();

// Pathfinding.Start({
//     grid: grid,
//     start: new Vector2(0, 0),
//     dest: new Vector2(9, 9),
//     verbose: true,
// })
