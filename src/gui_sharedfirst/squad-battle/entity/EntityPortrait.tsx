import React from "@rbxts/react";

function EntityPortrait({ portraitImage }: { portraitImage: string }) {
    return (
        <frame
            AnchorPoint={new Vector2(0.5, 0.5)}
            Position={UDim2.fromScale(0.5, 0.5)}
            Size={UDim2.fromScale(0.9, 0.9)}
            BackgroundColor3={new Color3(0.15, 0.15, 0.15)}
            BackgroundTransparency={0}
            ZIndex={0} // Above the HP bar
        >
            <uicorner CornerRadius={new UDim(1, 0)} />
            {/* Player Portrait */}
            <imagelabel
                Image={portraitImage}
                AnchorPoint={new Vector2(0.5, 0.5)}
                Position={UDim2.fromScale(0.5, 0.5)}
                Size={UDim2.fromScale(0.85, 0.85)}
                BackgroundTransparency={1}
                ZIndex={0} // Above the background
                ScaleType={Enum.ScaleType.Crop}
            >
                <uicorner CornerRadius={new UDim(1, 0)} />
            </imagelabel>
        </frame >);
}

export = EntityPortrait;