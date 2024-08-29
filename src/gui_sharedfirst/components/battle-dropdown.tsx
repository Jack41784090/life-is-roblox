import Roact, { Portal } from "@rbxts/roact";
import { Players, RunService } from "@rbxts/services";
import BattleCamera from "shared/class/BattleCamera";
import { getMouseWorldPosition } from "shared/func";

export interface BattleDDProps {
    options: string[];
    battleCamera: BattleCamera;
}
interface BattleDDState {
    isOpen: boolean;
    selectedOption: string;
    screenPosition: UDim2;
}

export default class BattleDD extends Roact.Component<BattleDDProps, BattleDDState> {
    worldPosition: Vector3 | undefined;
    dropDownFrame: Roact.Ref<Frame>;
    panScript: RBXScriptConnection | undefined;

    constructor(props: BattleDDProps) {
        super(props);
        this.dropDownFrame = Roact.createRef<Frame>();
        this.setState({
            isOpen: false,
            selectedOption: "",
        });
        this.panScript = RunService.RenderStepped.Connect(() => {
            if (!this.worldPosition) return;
            const [screenPoint, onScreen] = this.props.battleCamera.camera.WorldToScreenPoint(this.worldPosition);
            if (!onScreen) return;
            this.setState({ screenPosition: new UDim2(0, screenPoint.X, 0, screenPoint.Y) });
        });

        const rayCastVector = getMouseWorldPosition(this.props.battleCamera.camera, Players.LocalPlayer.GetMouse());
        this.worldPosition = rayCastVector;
        print(this.worldPosition);
    }

    protected willUnmount(): void {
        this.panScript?.Disconnect();
    }

    toggle() {
        const isAlreadyOpen = this.state.isOpen;
        const ddFrame = this.dropDownFrame.getValue();
        if (isAlreadyOpen) {
            this.setState({
                isOpen: false,
            });
        }

        if (ddFrame) {
            const size = isAlreadyOpen ? 1 : (this.props.options.size() + 1);
            ddFrame.TweenSize(
                new UDim2(0, 200, 0, 36 * size),
                Enum.EasingDirection.InOut,
                Enum.EasingStyle.Linear,
                0.2,
                true,
                () => {
                    if (!isAlreadyOpen) this.setState({
                        isOpen: true,
                    });
                }
            )
        }
    }

    handleOptionClick(option: string) {
        this.setState({
            selectedOption: option,
        });
        // Add your logic here for handling the selected option
        this.toggle();
    }

    handleToggleClick() {
        this.toggle();
    }

    render() {
        return (
            <Portal target={Players.LocalPlayer.WaitForChild("PlayerGui")}>
                <screengui Key="dropdown-gui"
                    IgnoreGuiInset={true}
                    DisplayOrder={1}
                >
                    <frame Key="dropdown"
                        BorderSizePixel={0}
                        Size={new UDim2(0, 200, 0, 36)}
                        Ref={this.dropDownFrame}
                        Position={this.state.screenPosition}
                    >
                        <textbutton Key="dropdown-toggle"
                            Size={new UDim2(1, 0, 0, 36)}
                            Event={{
                                MouseButton1Click: () => this.handleToggleClick(),
                            }}
                            Text={this.state.selectedOption || 'Select an option'}>
                        </textbutton>
                        {this.state.isOpen && (
                            <frame Key="dropdown-menu"
                                Position={new UDim2(0, 0, 0, 36)}
                                Size={new UDim2(1, 0, 0, 36 * this.props.options.size())}
                            >
                                {this.props.options.map((option) => (
                                    <textbutton Key={option}
                                        Size={new UDim2(1, 0, 0, 36)}
                                        Position={new UDim2(0, 0, 0, 36 * this.props.options.indexOf(option))}
                                        Event={{
                                            MouseButton1Click: () => this.handleOptionClick(option),
                                        }}
                                        Text={option}
                                    />
                                ))}
                            </frame>
                        )}
                    </frame>
                </screengui>

            </Portal>
        );
    }
}
