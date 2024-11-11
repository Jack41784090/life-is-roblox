import React, { ReactComponent } from "@rbxts/react";
import HexCell from "shared/class/battle/Hex/Cell";
import { getPlayer } from "shared/utils";
const playerGUI = getPlayer()?.FindFirstChild("PlayerGui");

export interface CellSurfaceElementProps {
    onclick?: () => void;
    onEnter?: () => void;
    onLeave?: () => void;
    cell: HexCell
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
        if (!playerGUI || !this.props.cell.part) {
            return undefined;
        }
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
