import { Atom } from "@rbxts/charm";
import React, { useEffect } from "@rbxts/react";
import { useAtom } from "@rbxts/react-charm";
import { ReadinessFragment } from "shared/class/battle/Systems/TurnSystem/types";
import ReadinessIconElement from "./icon_element";

interface Props {
    icons: Atom<Atom<ReadinessFragment>[]>;
    fullReadinessBarTravelTime?: number;
}

function ReadinessBar(props: Props) {
    // Use useAtom to properly subscribe to changes in the icons atom
    const icons = useAtom(props.icons);
    const barKey = `ReadinessBar-${icons.map(i => i().pos()).join('-')}`;

    useEffect(() => {
        warn(`ReadinessBar updated with icons: ${icons.map(i => i().pos()).join(', ')}`);
    }, [icons]);

    return (
        <frame
            key={barKey}
            Position={new UDim2(0.05, 0, 0.02, 0)} // Changed from 0.1 to 0.02 to move to top
            Size={new UDim2(0.9, 0, 0.06, 0)} // Made wider and slightly taller
            BackgroundTransparency={0.25}
            BackgroundColor3={new Color3(1, 0.03, 0.03)}
            BorderColor3={new Color3(0, 0, 0)}
            BorderSizePixel={2}
        >
            {icons.map((icon, index) => {
                return <ReadinessIconElement
                    key={`icon-${index}-${icon().pos()}`}
                    icon={icon}
                    index={index}
                    fullReadinessBarTravelTime={props.fullReadinessBarTravelTime ?? 5} // Default to 5 seconds if not provided
                />
            })}
        </frame>
    );
}

export = ReadinessBar;
