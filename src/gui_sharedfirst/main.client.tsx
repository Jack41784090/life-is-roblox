import { atom } from "@rbxts/charm";
import React from "@rbxts/react";
import { ContentProvider, ReplicatedFirst, Workspace } from "@rbxts/services";
import { setInterval } from "@rbxts/set-timeout";
import Scene from "shared/class/Scene";
import { GuiTag } from "shared/const";
import remotes from "shared/remote";
import { DialogueExpression } from "shared/types/scene-types";
import LoadingScreenElement from "./new_components/loading";
import GuiMothership from "./new_components/main";
import MainMenuElement from "./new_components/menu_ui";
import WaitingRoomElement from "./new_components/waiting_room";

//#region 1. LOADING
ReplicatedFirst.RemoveDefaultLoadingScreen();
while (!game.IsLoaded()) wait();

const assets = game.GetDescendants();
const numberOfAssets = assets.size();

let loadedAssetCount = 0;
const progressAtom = atom(0);
GuiMothership.mount("LoadingScreen", <LoadingScreenElement progress={progressAtom} />);

const threads: thread[] = [];
print("Preloading assets");
for (let i = 0; i < numberOfAssets; i++) {
    const thread = task.spawn(() => {
        const asset = assets[i];
        ContentProvider.PreloadAsync([asset]);
        loadedAssetCount++;
    })
    threads.push(thread);
}

const checkProgress = setInterval(() => {
    print(`${loadedAssetCount / numberOfAssets * 100}% loaded`);
    progressAtom(loadedAssetCount / numberOfAssets);
}, .1);

// Wait for all assets to be preloaded
while (progressAtom() < 1) wait();
checkProgress();
print("Preloading complete");

// Remove the loading screen after preloading is complete
GuiMothership.unmount("LoadingScreen");
//#endregion

//#region 2. MAIN MENU


// Setup the camera
function mainMenuCameraSetup() {
    const currentCamera = Workspace.CurrentCamera;
    if (!currentCamera) {
        throw "No current camera found";
    }
    const camPos = Workspace.WaitForChild("campos1") as Part;
    assert(camPos.IsA("Part"), "campos1 is not a part");
    currentCamera.CameraType = Enum.CameraType.Scriptable;
    currentCamera.CFrame = camPos.CFrame;
}

// Setup the main menu
function enterPlayground() {
    if (Workspace.CurrentCamera) {
        Workspace.CurrentCamera.CameraType = Enum.CameraType.Custom;
    }
    remotes.loadCharacter();
}
function enterBattle() {
    print("Entering battle");
    remotes.battle.request();
}
function enterStory() {
    const scene = new Scene('scene');
    scene.addDialogue({
        text: 'Hello, World!',
        speaker: 'NPC',
        expression: DialogueExpression.Neutral,
        effects: []
    }, {
        text: 'Hello back',
        speaker: 'NPC2',
        expression: DialogueExpression.Neutral,
        effects: []
    }, {
        text: 'Goodbye',
        speaker: '',
        expression: DialogueExpression.Neutral,
        effects: []
    })
    scene.playFromBeginning();
}
function mainMenuSetup() {
    print("Setting up main menu");
    const mainMenuButtons: Omit<{
        text: string;
        size: number;
        position: number;
        transparency?: number;
        onClick: () => void;
    }, "size" | "position">[] = [
            {
                text: "Play",
                onClick: () => {
                    GuiMothership.unmount("MainMenu");
                    enterPlayground();
                },
            },
            {
                text: "Battle",
                onClick: () => {
                    GuiMothership.unmount("MainMenu");
                    enterBattle();
                }
            },
            {
                text: "Story",
                onClick: () => {
                    GuiMothership.unmount("MainMenu");
                    enterStory();
                }
            },
            {
                text: "Multiplayer",
                onClick: () => {
                    GuiMothership.unmount("MainMenu");
                    remotes.battle.requestRoom();
                }
            }
        ];

    GuiMothership.mount("MainMenu", <MainMenuElement title="Condor" buttons={mainMenuButtons} />);
}

remotes.battle.ui.unmount.connect(tag => GuiMothership.unmount(tag));
remotes.battle.ui.startRoom.connect(s => {
    print("Start Room", s);
    GuiMothership.mount(GuiTag.WaitingRoom, <WaitingRoomElement
        players={s}
        readyButtonClicked={() => {
            enterBattle();
        }}
    />)
})


mainMenuCameraSetup();
enterBattle();
// mainMenuSetup();
//#endregion

