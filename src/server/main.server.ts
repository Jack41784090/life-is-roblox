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
    players: TeamMap
} = {
    players: {}
}

serverRemotes.requestRoom.connect(p => {
    print("Battle Request Room", p);
    room.players[p.Name] = [p];
    for (const players of extractMapValues(room.players)) {
        print("Starting room for player", players);
        players.forEach(p => clientRemotes.ui.startRoom.fire(p, players));
    }
})

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
