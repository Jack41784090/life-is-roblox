import { Atom } from "@rbxts/charm";
import React from "@rbxts/react";
import { useAtom } from "@rbxts/react-charm";
import { EffectsManager } from "gui_sharedfirst/new_components/effects";
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
                {mode === 'withSensitiveCells' && props.cells}
                <EffectsManager maxEffects={15} />
            </frame>
        </screengui>
    );
}

export = MainFrame;
