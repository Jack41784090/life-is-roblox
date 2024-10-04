import Roact from "@rbxts/roact";
import Cell from "shared/class/Cell";
import { getPlayer } from "shared/utils";
const playerGUI = getPlayer()?.FindFirstChild("PlayerGui");

export interface CellSurfaceElementProps {
    onclick?: () => void;
    onEnter?: () => void;
    onLeave?: () => void;
    cell: Cell
}
interface CellSurfaceElementState { }

export default class CellSurfaceElement extends Roact.Component<CellSurfaceElementProps, CellSurfaceElementState> {
    private buttonRef: Roact.Ref<TextButton>;

    constructor(props: CellSurfaceElementProps) {
        super(props);
        this.buttonRef = Roact.createRef<TextButton>();
    }

    render() {
        if (!playerGUI) {
            return undefined;
        }
        return (
            <surfacegui
                Key={this.props.cell.part.Name}
                Adornee={this.props.cell.part}
                Face={"Top"}
                AlwaysOnTop={true}
            >
                <textbutton
                    Ref={this.buttonRef}
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
