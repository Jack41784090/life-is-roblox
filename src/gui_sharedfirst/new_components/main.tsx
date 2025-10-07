import React from "@rbxts/react";
import ReactRoblox, { createPortal, createRoot } from "@rbxts/react-roblox";
import { getPlayer } from "shared/utils";

const playerGUI = getPlayer()?.FindFirstChild("PlayerGui");

class GuiMothership {
    public static instance: GuiMothership;
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

    public static Get() {
        if (!GuiMothership.instance) {
            GuiMothership.instance = new GuiMothership();
        }
        return GuiMothership.instance;
    }

    public static Mount(key: string, element: React.Element, overwrite = true): void {
        // print("Mounting", key, element);
        if (!GuiMothership.instance) {
            GuiMothership.instance = new GuiMothership();
        }
        const instance = GuiMothership.instance;
        if (overwrite || !instance.children.has(key)) {
            instance.children.delete(key);
            instance.children.set(key, element);
            instance.root.render(instance.element());
        }
        else if (instance.children.has(key)) {
            warn(`GuiMothership: Key ${key} already exists. Use overwrite=true to replace.`);
        }
        // print("Mounting", key, instance.children);
    }

    public static Unmount(key: string[]): void;
    public static Unmount(key: string): void;
    public static Unmount(key: string | string[]) {
        if (!GuiMothership.instance) {
            return;
        }
        const instance = GuiMothership.instance;
        if (typeIs(key, "string")) {
            instance.children.delete(key);
            instance.root.render(instance.element());
        } else {
            for (const k of key) {
                instance.children.delete(k);
            }
        }
    }

    private element() {
        if (!playerGUI) {
            return undefined;
        }

        // Convert the Map to an array to ensure React renders properly
        const childrenArray: React.Element[] = [];
        this.children.forEach((element, key) => {
            childrenArray.push(element);
        });

        return (
            createPortal(
                <screengui
                    key={`MAIN`}
                    ResetOnSpawn={false}
                    ZIndexBehavior={Enum.ZIndexBehavior.Sibling}
                    IgnoreGuiInset={true}
                >
                    {childrenArray}
                </screengui>,
                playerGUI)
        );
    }
}

export = GuiMothership