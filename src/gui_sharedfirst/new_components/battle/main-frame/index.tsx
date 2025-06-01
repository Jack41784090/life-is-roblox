import { Atom } from "@rbxts/charm";
import React from "@rbxts/react";
import { EffectsManager } from "gui_sharedfirst/new_components/effects";
import { ReadinessFragment } from "shared/class/battle/Systems/TurnSystem/types";
import ReadinessBar from "../readiness_bar";

interface Props {
    cells?: React.Element;
    portrait?: React.Element;
    icons: Atom<Atom<ReadinessFragment>[]>;
    abilityPanel?: React.Element;
    controlPanel?: React.Element;
}

function MainFrame(props: Props) {
    return (
        <screengui
            key={`UnifiedBattleUI-${tick()}`}
            ResetOnSpawn={false}
            ZIndexBehavior={Enum.ZIndexBehavior.Sibling}
            IgnoreGuiInset={true}
        >
            <frame
                key={"Readiness-Portrait-Container"}
                AnchorPoint={new Vector2(0, 1)}
                Position={UDim2.fromScale(0, 1)}
                Size={UDim2.fromScale(0.6, 0.5)}
                BackgroundTransparency={1}
            >
                <ReadinessBar icons={props.icons} />
                {props.portrait}
            </frame>
            {props.cells}
            {props.abilityPanel}
            {props.controlPanel}
            <EffectsManager maxEffects={15} />
        </screengui>
    );
}

export = MainFrame;
