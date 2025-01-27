import React, { ReactComponent } from "@rbxts/react";
import HexCellGraphics from "shared/class/battle/State/Hex/Cell/Graphics";

export interface CellSurfaceElementProps {
    onclick?: () => void;
    onEnter?: () => void;
    onLeave?: () => void;
    cell: HexCellGraphics
}
interface CellSurfaceElementState { }

@ReactComponent
export default class CellSurfaceElement extends React.Component<CellSurfaceElementProps, CellSurfaceElementState> {
    private buttonRef: React.RefObject<TextButton>;

    constructor(props: CellSurfaceElementProps) {
        super(props);
        this.buttonRef = React.createRef<TextButton>();
    }

    render() {
        assert(this.props.cell.part, "CellSurfaceElement requires a part to render");
        return (
            <surfacegui
                key={this.props.cell.part.Name}
                Adornee={this.props.cell.part}
                Face={"Top"}
                AlwaysOnTop={true}
            >
                <textbutton
                    ref={this.buttonRef}
                    Position={new UDim2(0.5, 0, 0.5, 0)}
                    AnchorPoint={new Vector2(0.5, 0.5)}
                    Size={new UDim2(.6, 0, .6, 0)}
                    BackgroundTransparency={1}
                    Event={{
                        MouseButton1Click: this.props.onclick,
                        MouseEnter: this.props.onEnter,
                        MouseLeave: this.props.onLeave,
                    }}
                />
            </surfacegui>
        );
    }
}
