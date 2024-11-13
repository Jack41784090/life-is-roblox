import React from "@rbxts/react";

interface Props {
    transparency?: number;
    zIndex?: number;
    backgroundColour?: Color3;
    frameKey?: string;
}

function LoadingScreenBackground({ frameKey, backgroundColour, transparency, zIndex, children }: React.PropsWithChildren<Props>) {
    return (
        <frame
            key={frameKey || "MenuFrame"}
            Size={new UDim2(1, 0, 1, 0)}
            BackgroundColor3={backgroundColour ?? new Color3()}
            BackgroundTransparency={transparency === undefined ? 0 : transparency}
            ZIndex={zIndex || 1}
        >
            {children}
        </frame>
    );
}

export = LoadingScreenBackground