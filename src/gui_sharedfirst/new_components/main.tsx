import React from "@rbxts/react";
import { createPortal } from "@rbxts/react-roblox";
import { getPlayer } from "shared/utils";

const playerGUI = getPlayer()?.FindFirstChild("PlayerGui");

function MAINElement() {
    if (!playerGUI) {
        return undefined;
    }

    return (
        createPortal(
            <screengui
                key={"MAIN"}
                ResetOnSpawn={false}
                ZIndexBehavior={Enum.ZIndexBehavior.Sibling}
                IgnoreGuiInset={true}
            >
                {/* children */}
            </screengui>,
            playerGUI)
    );
}

export = MAINElement