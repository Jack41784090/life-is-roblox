import { Atom } from "@rbxts/charm";
import React from "@rbxts/react";
import { useAtom } from "@rbxts/react-charm";
import { GuiModes } from "shared/class/battle/Client/Gui/types";
import { ReadinessFragment } from "shared/class/battle/Systems/TurnSystem/types";
import ReadinessBar from "../readiness_bar";

interface Props {
    mode: Atom<GuiModes>;
    cells?: React.Element;
    portrait?: React.Element;
    icons: Atom<Atom<ReadinessFragment>[]>;
}

function MainFrame(props: Props) {
    // Use useAtom to properly subscribe to changes in the icons atom
    print("Mounting MainFrame", props);
    const mode = useAtom(props.mode);

    return (
        <screengui
            key="MenuScreenGui"
            ResetOnSpawn={false}
            ZIndexBehavior={Enum.ZIndexBehavior.Sibling}
            IgnoreGuiInset={true}
        >
            <frame
                key={"MenuFrame"}
                Size={new UDim2(1, 0, 1, 0)}
                BackgroundColor3={Color3.fromRGB(0, 0, 0)}
                BackgroundTransparency={1}
            >
                <ReadinessBar icons={props.icons} />
                {props.portrait}
                {mode === 'withSensitiveCells' ? props.cells : undefined}
            </frame>
        </screengui>
    );
}

export = MainFrame;
