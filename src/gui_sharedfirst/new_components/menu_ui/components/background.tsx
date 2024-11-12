import * as React from 'react';

interface MenuFrameElementProps {
    transparency?: number;
    zIndex?: number;
    backgroundColour?: Color3;
    frameKey?: string;
}

export function MainMenuBackground({ frameKey, backgroundColour, transparency, zIndex, children }: React.PropsWithChildren<MenuFrameElementProps>) {
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

export default MainMenuBackground;