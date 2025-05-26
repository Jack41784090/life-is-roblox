import * as React from 'react';

interface MenuFrameElementProps {
    transparency?: number;
    zIndex?: number;
    backgroundColour?: Color3;
    frameKey?: string;
}

export function WaitingRoomBackground({ frameKey, backgroundColour, transparency, zIndex, children }: React.PropsWithChildren<MenuFrameElementProps>) {
    return (
        <frame
            key={frameKey || "WaitingRoomBackground"}
            Size={new UDim2(1, 0, 1, 0)}
            BackgroundColor3={backgroundColour ?? Color3.fromRGB(15, 15, 20)}
            BackgroundTransparency={transparency === undefined ? 0 : transparency}
            ZIndex={zIndex || 1}
            BorderSizePixel={0}
        >
            <frame
                Size={UDim2.fromScale(1, 1)}
                BackgroundTransparency={0.85}
                BackgroundColor3={Color3.fromRGB(0, 0, 0)}
                BorderSizePixel={0}
                ZIndex={-1}
            >
                <imagelabel
                    Size={UDim2.fromScale(1, 1)}
                    BackgroundTransparency={1}
                    Image="rbxasset://textures/ui/GuiImagePlaceholder.png"
                    ImageTransparency={0.7}
                    ScaleType={Enum.ScaleType.Tile}
                    TileSize={UDim2.fromOffset(100, 100)}
                />
            </frame>

            {children}
        </frame>
    );
}

export default WaitingRoomBackground;