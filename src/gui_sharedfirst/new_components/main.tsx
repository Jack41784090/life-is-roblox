import React from "@rbxts/react";
import ReactRoblox, { createPortal, createRoot } from "@rbxts/react-roblox";
import { getPlayer } from "shared/utils";

const playerGUI = getPlayer()?.FindFirstChild("PlayerGui");

class MainGui {
    public static instance: MainGui;
    private root: ReactRoblox.Root;
    private children: Map<string, React.Element> = new Map();

    private constructor() {
        this.root = createRoot(new Instance('Folder'))
        const e = this.element();
        if (!e) {
            error("Failed to create MainGui");
        };

        this.root.render(e);
    }

    public static create() {
        if (!MainGui.instance) {
            MainGui.instance = new MainGui();
        }
        return MainGui.instance;
    }

    public static mount(key: string, element: React.Element) {
        if (!MainGui.instance) {
            MainGui.instance = new MainGui();
        }
        const instance = MainGui.instance;
        instance.children.set(key, element);
        instance.root.render(instance.element());
    }

    public static unmount(key: string) {
        if (!MainGui.instance) {
            return;
        }
        const instance = MainGui.instance;
        instance.children.delete(key);
        instance.root.render(instance.element());
    }

    private element() {
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
                    {this.children}
                    {/* {extractMapValues(this.children)} */}
                </screengui>,
                playerGUI)
        );
    }
}

export = MainGui