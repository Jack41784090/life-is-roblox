import { atom } from "@rbxts/charm";
import React from "@rbxts/react";
import ReactRoblox from "@rbxts/react-roblox";
import { CreateReactStory } from "@rbxts/ui-labs";
import AbilityControlPanel from "gui_sharedfirst/new_components/battle/ability_control_panel";
import ReadinessBar from "gui_sharedfirst/new_components/battle/readiness_bar";
import PlayerPortrait from "gui_sharedfirst/new_components/battle/statusBar/playerPortrait";
import { EffectsManager } from "gui_sharedfirst/new_components/effects";
import Entity from "shared/class/battle/State/Entity";
import { EntityConfig } from "shared/class/battle/State/Entity/types";
import { AbilitySet } from "shared/class/battle/Systems/CombatSystem/Ability/types";
import { ReadinessFragment } from "shared/class/battle/Systems/TurnSystem/types";
import { getDummyStats } from "shared/utils";

const mockPlayerPortrait = <PlayerPortrait
    entityId="entity_adalbrecht"
    hp={atom(75)}
    maxHP={100}
/>;

const mockSensitiveCells = <frame key="mock-sensitive-cells">
    <textlabel Text="Mock Sensitive Cells" Size={new UDim2(1, 0, 1, 0)} />
</frame>;
const mockReadinessIcons = atom([
    atom({
        id: 1,
        icon: "entity_adalbrecht",
        spd: atom(25),
        pos: atom(45)
    } as ReadinessFragment),
    atom({
        id: 2,
        icon: "entity_adalbrecht",
        spd: atom(30),
        pos: atom(78)
    } as ReadinessFragment),
    atom({
        id: 3,
        icon: "entity_adalbrecht",
        spd: atom(20),
        pos: atom(12)
    } as ReadinessFragment),
    atom({
        id: 4,
        icon: "entity_adalbrecht",
        spd: atom(35),
        pos: atom(89)
    } as ReadinessFragment)
]);

// Mock Entity creation
const mockEntityConfig: EntityConfig = {
    playerID: 123456,
    name: "Mock Battle Entity",
    team: "PlayerTeam",
    qr: new Vector2(0, 0),
    stats: getDummyStats(),
    hip: 100,
    sta: 100,
    org: 100,
    pos: 100,
    mana: 50
};

const mockEntity = new Entity(mockEntityConfig);

// Mock AbilitySet - creating a basic ability set with Q and W abilities
const mockAbilitySet: AbilitySet = {
    Q: {
        name: "Strike",
        description: "A basic melee attack",
        icon: "rbxasset://textures/ui/GuiImagePlaceholder.png",
        animation: "slash",
        direction: "1, 0, 0",
        cost: { pos: 25 },
        dices: [{ damage: 15, accuracy: 85 }],
        range: 2
    },
    W: {
        name: "Guard",
        description: "Defensive stance that reduces incoming damage",
        icon: "rbxasset://textures/ui/GuiImagePlaceholder.png",
        animation: "block",
        direction: "0, 1, 0",
        cost: { pos: 15 },
        dices: [{ damage: 0, accuracy: 100 }],
        range: 1
    }
} as unknown as AbilitySet;

const story = CreateReactStory({
    react: React,
    reactRoblox: ReactRoblox,
}, (props) => {
    const readiness_portrait = <frame
        key={`BattleUI-${tick()}`}
        Size={new UDim2(1, 0, 1, 0)}
        BackgroundColor3={Color3.fromRGB(0, 0, 0)}
        BackgroundTransparency={1}
    >
        <frame
            key={"Readiness-Portrait-Container"}
            AnchorPoint={new Vector2(0, 1)}
            Position={UDim2.fromScale(0, 1)}
            Size={UDim2.fromScale(0.6, 0.5)}
            BackgroundTransparency={1}
        >
            <ReadinessBar icons={mockReadinessIcons} />
            {mockPlayerPortrait}
        </frame>
        {mockSensitiveCells}
        <EffectsManager maxEffects={15} />
    </frame>;

    const abilityControlPanel = <AbilityControlPanel
        cre={mockEntity}
        abilitySet={mockAbilitySet}
        onStyleSelect={(styleIndex: number) => {
            print(`Fighting style changed to index: ${styleIndex}`);
        }}
    />;

    return <>
        {readiness_portrait}
        {abilityControlPanel}
    </>;
});

export = story;