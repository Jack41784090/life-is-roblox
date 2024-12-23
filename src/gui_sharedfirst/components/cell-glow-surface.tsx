import React, { ReactComponent } from "@rbxts/react";
import { RunService, TweenService } from "@rbxts/services";
import HexCellGraphics from "shared/class/battle/Hex/Cell/Graphics";
import { SELECTED_COLOUR } from "shared/const";
import { getPlayer } from "shared/utils";
const playerGUI = getPlayer()?.FindFirstChild("PlayerGui");

export interface CellGlowSurfaceElementProps {
    cell: HexCellGraphics
}
interface CellGlowSurfaceElementState {
    size: UDim2;
    transparency: number;
}

@ReactComponent
export default class CellGlowSurfaceElement extends React.Component<CellGlowSurfaceElementProps, CellGlowSurfaceElementState> {
    private buttonRef: React.RefObject<TextButton>;
    private running: boolean = true;
    private connection: RBXScriptConnection | undefined;
    state = {
        size: new UDim2(1, 0, 1, 0),
        transparency: 0,
    }

    constructor(props: CellGlowSurfaceElementProps) {
        super(props);
        this.buttonRef = React.createRef<TextButton>();
    }

    private tweenColor(targetColor: Color3, transparency: number, size: UDim2 = new UDim2(1, 0, 1, 0)) {
        const button = this.buttonRef.current;
        if (button) {
            const tweenInfo = new TweenInfo(0.25, Enum.EasingStyle.Quad, Enum.EasingDirection.Out);
            const tween = TweenService.Create(button, tweenInfo, {
                BackgroundColor3: targetColor,
                BackgroundTransparency: transparency,
                Size: size,
            });
            tween.Play();
        }
    }

    static MIN_SIZE = 0.5;
    static MAX_SIZE = 1;
    static MIN_TRANSPARENCY = 0.25;
    static MAX_TRANSPARENCY = 0.75;
    protected didMount(): void {
        this.connection = RunService.RenderStepped.Connect(() => {
            if (this.running) {
                const size =
                    CellGlowSurfaceElement.MIN_SIZE +
                    math.abs(-(CellGlowSurfaceElement.MAX_SIZE - CellGlowSurfaceElement.MIN_SIZE) + (tick() % ((CellGlowSurfaceElement.MAX_SIZE - CellGlowSurfaceElement.MIN_SIZE) * 2)));

                const transparency =
                    CellGlowSurfaceElement.MIN_TRANSPARENCY +
                    math.abs(-(CellGlowSurfaceElement.MAX_TRANSPARENCY - CellGlowSurfaceElement.MIN_TRANSPARENCY) + (tick() % ((CellGlowSurfaceElement.MAX_TRANSPARENCY - CellGlowSurfaceElement.MIN_TRANSPARENCY) * 2)));

                this.setState({
                    size: new UDim2(size, 0, size, 0),
                    transparency: transparency,
                });
            }
        });
    }

    protected willUnmount(): void {
        this.running = false;
        if (this.connection) {
            this.connection.Disconnect();
        }
    }

    render() {
        if (!playerGUI) {
            return undefined;
        }
        return (
            <surfacegui Adornee={this.props.cell.part} Face={"Top"}>
                <textbutton
                    ref={this.buttonRef}
                    BackgroundTransparency={this.state.transparency}
                    BackgroundColor3={SELECTED_COLOUR}
                    Position={new UDim2(0.5, 0, 0.5, 0)}
                    AnchorPoint={new Vector2(0.5, 0.5)}
                    Size={this.state.size}
                />
            </surfacegui>
        );
    }
}
