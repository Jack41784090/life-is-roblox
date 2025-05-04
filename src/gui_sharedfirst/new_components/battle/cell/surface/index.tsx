import React from "@rbxts/react";
import HexCellGraphics from "shared/class/battle/State/Hex/Cell/Graphics";

interface Props {
    onclick?: () => void;
    onEnter?: () => void;
    onLeave?: () => void;
    cell: HexCellGraphics
}

function CellSurface(props: Props) {
    const buttonRef: React.RefObject<TextButton> = React.createRef<TextButton>();
    return (
        <surfacegui
            key={props.cell.part.Name}
            Adornee={props.cell.part}
            Face={"Top"}
            AlwaysOnTop={true}
        >
            <textbutton
                ref={buttonRef}
                Position={new UDim2(0.5, 0, 0.5, 0)}
                AnchorPoint={new Vector2(0.5, 0.5)}
                Size={new UDim2(.6, 0, .6, 0)}
                BackgroundTransparency={1}
                Event={{
                    MouseButton1Click: props.onclick,
                    MouseEnter: props.onEnter,
                    MouseLeave: props.onLeave,
                }}
            />
        </surfacegui>
    );
}

export = CellSurface;
