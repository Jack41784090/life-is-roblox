import React, { useEffect } from "@rbxts/react";
import { RunService } from "@rbxts/services";
import HexCellGraphics from "shared/class/battle/State/Hex/Cell/Graphics";
import { SELECTED_COLOUR } from "shared/const";

interface Props {
    onclick?: () => void;
    onEnter?: () => void;
    onLeave?: () => void;
    cell: HexCellGraphics
}

function CellGlowingSurface(props: Props) {
    const MIN_SIZE = 0.5;
    const MAX_SIZE = 1;
    const MIN_TRANSPARENCY = 0.25;
    const MAX_TRANSPARENCY = 0.75;
    const [size, setSize] = React.useState<UDim2>(new UDim2(1, 0, 1, 0));
    const [transparency, setTransparency] = React.useState<number>(0);

    useEffect(() => {
        const connection = RunService.RenderStepped.Connect(() => {
            const size =
                MIN_SIZE +
                math.abs(-(MAX_SIZE - MIN_SIZE) + (tick() % ((MAX_SIZE - MIN_SIZE) * 2)));

            const transparency =
                MIN_TRANSPARENCY +
                math.abs(-(MAX_TRANSPARENCY - MIN_TRANSPARENCY) + (tick() % ((MAX_TRANSPARENCY - MIN_TRANSPARENCY) * 2)));

            setSize(new UDim2(size, 0, size, 0));
            setTransparency(transparency);
        });
        return () => {
            connection.Disconnect();
        }
    })

    const buttonRef: React.RefObject<TextButton> = React.createRef<TextButton>();
    return (
        <surfacegui Adornee={props.cell.part} Face={"Top"}>
            <textbutton
                ref={buttonRef}
                BackgroundTransparency={transparency}
                BackgroundColor3={SELECTED_COLOUR}
                Position={new UDim2(0.5, 0, 0.5, 0)}
                AnchorPoint={new Vector2(0.5, 0.5)}
                Size={size}
            />
        </surfacegui>
    );
}

export = CellGlowingSurface;
