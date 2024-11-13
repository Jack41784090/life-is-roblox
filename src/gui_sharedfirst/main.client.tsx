import { atom } from "@rbxts/charm";
import React from "@rbxts/react";
import { ContentProvider, ReplicatedFirst, Workspace } from "@rbxts/services";
import { setInterval } from "@rbxts/set-timeout";
import * as Battle from "shared/class/battle";
import Scene from "shared/class/Scene";
import { DialogueExpression } from "shared/types/scene-types";
import { remoteEventsMap } from "shared/utils/events";
import LoadingScreenElement from "./new_components/loading";
import MainGui from "./new_components/main";
import MainMenuElement from "./new_components/menu_ui";

//#region 1. LOADING
ReplicatedFirst.RemoveDefaultLoadingScreen();
while (!game.IsLoaded()) wait();

const assets = game.GetDescendants();
const numberOfAssets = assets.size();

let loadedAssetCount = 0;
const progressAtom = atom(0);
MainGui.mount("LoadingScreen", <LoadingScreenElement progress={progressAtom} />);

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
MainGui.unmount("LoadingScreen");
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
    const loadCharacterEvent = remoteEventsMap["LoadCharacterEvent"] as RemoteEvent;
    loadCharacterEvent.FireServer();
}
function enterBattle() {
    Battle.remoteEvent_Start.FireServer();
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
                    MainGui.unmount("MainMenu");
                    enterPlayground();
                },
            },
            {
                text: "Battle",
                onClick: () => {
                    MainGui.unmount("MainMenu");
                    enterBattle();
                }
            },
            {
                text: "Story",
                onClick: () => {
                    MainGui.unmount("MainMenu");
                    enterStory();
                }
            }
        ];

    MainGui.mount("MainMenu", <MainMenuElement title="Condor" buttons={mainMenuButtons} />);
}


print("Initializing main menu");
mainMenuCameraSetup();
mainMenuSetup();
//#endregion

