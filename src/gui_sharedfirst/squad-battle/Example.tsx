import React from "@rbxts/react";
import { Squad } from "squad-battle/Squad";
import { EntityConfig, SquadConfig } from "squad-battle/type";
import { BattleField, EntityDisplay, SquadDisplay } from "./index";

function SquadBattleExample() {
    const sampleEntityConfig: EntityConfig = {
        playerID: 12345,
        team: "heroes",
        name: "Warrior Alpha",
        stats: {
            id: "warrior-001",
            str: 85,
            dex: 70,
            acr: 60,
            spd: 75,
            siz: 80,
            int: 50,
            spr: 45,
            fai: 40,
            cha: 55,
            beu: 60,
            wil: 90,
            end: 95
        }
    };

    const enemyEntityConfig: EntityConfig = {
        playerID: 54321,
        team: "enemies",
        name: "Shadow Warrior",
        stats: {
            id: "shadow-001",
            str: 75,
            dex: 70,
            acr: 60,
            spd: 75,
            siz: 80,
            int: 50,
            spr: 45,
            fai: 40,
            cha: 55,
            beu: 60,
            wil: 90,
            end: 95
        }
    };

    const heroSquadConfig: SquadConfig = {
        name: "Iron Legion",
        team: "heroes",
        entities: [sampleEntityConfig]
    };

    const enemySquadConfig: SquadConfig = {
        name: "Dark Horde",
        team: "enemies",
        entities: [enemyEntityConfig]
    };

    const heroSquad = new Squad(heroSquadConfig);
    const enemySquad = new Squad(enemySquadConfig);

    const sampleBattleData = {
        heroes: [heroSquad],
        enemies: [enemySquad]
    };

    return (
        <frame
            Size={new UDim2(1, 0, 1, 0)}
            BackgroundColor3={new Color3(0.1, 0.1, 0.1)}
        >
            <textlabel
                Size={new UDim2(1, 0, 0, 50)}
                BackgroundTransparency={1}
                Text="Squad Battle GUI Components Demo"
                TextColor3={new Color3(1, 1, 1)}
                TextScaled={true}
                Font={Enum.Font.GothamBold}
            />

            <frame
                Size={new UDim2(0.25, 0, 0.3, 0)}
                Position={new UDim2(0, 10, 0, 60)}
                BackgroundTransparency={1}
            >
                <textlabel
                    Size={new UDim2(1, 0, 0, 20)}
                    BackgroundTransparency={1}
                    Text="Entity Display:"
                    TextColor3={new Color3(0.8, 0.8, 0.8)}
                    Font={Enum.Font.Gotham}
                    TextScaled={true}
                />
                <EntityDisplay
                    name={heroSquad.entities[0].name}
                    playerID={heroSquad.entities[0].playerID}
                    team={heroSquad.entities[0].team}
                    baseStats={heroSquad.entities[0].stats}
                    changeableStats={heroSquad.entities[0].changeableStats}
                    position={new UDim2(0, 0, 0, 25)}
                />
            </frame>

            <frame
                Size={new UDim2(0.7, 0, 0.6, 0)}
                Position={new UDim2(0.25, 10, 0, 60)}
                BackgroundTransparency={1}
            >
                <textlabel
                    Size={new UDim2(1, 0, 0, 20)}
                    BackgroundTransparency={1}
                    Text="Squad Display:"
                    TextColor3={new Color3(0.8, 0.8, 0.8)}
                    Font={Enum.Font.Gotham}
                    TextScaled={true}
                />
                <SquadDisplay
                    name={heroSquad.name}
                    team={heroSquad.team}
                    entities={heroSquad.entities}
                    position={new UDim2(0, 0, 0, 25)}
                />
            </frame>

            <frame
                Size={new UDim2(1, -20, 0.35, 0)}
                Position={new UDim2(0, 10, 0.65, 0)}
                BackgroundTransparency={1}
            >
                <textlabel
                    Size={new UDim2(1, 0, 0, 20)}
                    BackgroundTransparency={1}
                    Text="Battle Field:"
                    TextColor3={new Color3(0.8, 0.8, 0.8)}
                    Font={Enum.Font.Gotham}
                    TextScaled={true}
                />
                <frame
                    Size={new UDim2(1, 0, 1, -25)}
                    Position={new UDim2(0, 0, 0, 25)}
                    BackgroundTransparency={1}
                >
                    <BattleField
                        squads={sampleBattleData}
                        currentRound={1}
                    />
                </frame>
            </frame>
        </frame>
    );
}

export = SquadBattleExample;