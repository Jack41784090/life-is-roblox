import { Atom } from "@rbxts/charm";
import React from "@rbxts/react";
import { useAtom } from "@rbxts/react-charm";
import { ReadinessFragment } from "shared/class/battle/Systems/TurnSystem/types";
import ReadinessIconElement from "./icon_element";

interface Props {
    icons: Atom<Atom<ReadinessFragment>[]>; // Array of image URLs or asset IDs for character icons
}

function ReadinessBar(props: Props) {
    // Use useAtom to properly subscribe to changes in the icons atom
    const icons = useAtom(props.icons);

    // Use a unique key based on the contents to force re-render when order changes
    const barKey = `ReadinessBar-${icons.map(i => i().pos()).join('-')}`;

    return (
        <frame
            key={barKey}
            AnchorPoint={new Vector2(0, .5)}
            Position={UDim2.fromScale(0.2, 0.9)}
            // Size={new UDim2(0.5, 0, 0.06, 0)}
            Size={UDim2.fromScale(0.8, 0.06)}
            BackgroundTransparency={.45}
            BackgroundColor3={new Color3(0, 0.03, 0.03)}
            BorderColor3={new Color3(0, 0, 0)}
            BorderSizePixel={2}
            Transparency={0.5}
        >
            <textlabel
                Text={"⌛"}
                AnchorPoint={new Vector2(0.5, 0.5)}
                Position={UDim2.fromScale(.75, .5)}
                ZIndex={10}
                TextScaled={true}
                Size={UDim2.fromScale(1, 2)}
                BackgroundTransparency={1}
                SizeConstraint={Enum.SizeConstraint.RelativeYY}

            />
            <uicorner CornerRadius={new UDim(0.5, 0)} />
            {icons.map((icon, index) => {
                return <ReadinessIconElement key={`icon-${index}-${icon().pos()}`} icon={icon} index={index} />
            })}
        </frame>
    );
}

export = ReadinessBar;
