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
    private worldPosition?: Vector3;
    private dropDownFrame: Roact.Ref<Frame>;
    private panScript?: RBXScriptConnection;

    constructor(props: BattleDDProps) {
        super(props);
        this.dropDownFrame = Roact.createRef<Frame>();
        this.state = {
            isOpen: false,
            selectedOption: "",
            screenPosition: new UDim2(),
        };
        this.initializeWorldPosition();
        this.connectPanScript();
    }

    private initializeWorldPosition() {
        const rayCastVector = getMouseWorldPosition(this.props.battleCamera.camera, Players.LocalPlayer.GetMouse());
        this.worldPosition = rayCastVector;
        print(this.worldPosition);
    }

    private connectPanScript() {
        this.panScript = RunService.RenderStepped.Connect(() => {
            if (!this.worldPosition) return;
            const [screenPoint, onScreen] = this.props.battleCamera.camera.WorldToScreenPoint(this.worldPosition);
            if (onScreen) {
                this.setState({ screenPosition: new UDim2(0, screenPoint.X, 0, screenPoint.Y) });
            }
        });
    }

    protected willUnmount(): void {
        this.panScript?.Disconnect();
    }

    private toggleDropdown() {
        const isAlreadyOpen = this.state.isOpen;
        const ddFrame = this.dropDownFrame.getValue();

        if (ddFrame) {
            const targetSize = isAlreadyOpen ? 1 : this.props.options.size() + 1;
            ddFrame.TweenSize(
                new UDim2(0, 200, 0, 36 * targetSize),
                Enum.EasingDirection.InOut,
                Enum.EasingStyle.Linear,
                0.2,
                true,
                () => {
                    if (!isAlreadyOpen) {
                        this.setState({ isOpen: true });
                    } else {
                        this.setState({ isOpen: false });
                    }
                }
            );
        }
    }

    private handleOptionClick(option: string) {
        this.setState({
            selectedOption: option,
        });
        this.toggleDropdown();
    }

    private handleToggleClick() {
        this.toggleDropdown();
    }

    render() {
        return (
            <Portal target={Players.LocalPlayer.WaitForChild("PlayerGui")}>
                <screengui Key="dropdown-gui" IgnoreGuiInset={true} DisplayOrder={1}>
                    <frame
                        Key="dropdown"
                        BorderSizePixel={0}
                        Size={new UDim2(0, 200, 0, 36)}
                        Ref={this.dropDownFrame}
                        Position={this.state.screenPosition}
                    >
                        <textbutton
                            Key="dropdown-toggle"
                            Size={new UDim2(1, 0, 0, 36)}
                            Event={{
                                MouseButton1Click: () => this.handleToggleClick(),
                            }}
                            Text={this.state.selectedOption || "Select an option"}
                        />
                        {this.state.isOpen && (
                            <frame
                                Key="dropdown-menu"
                                Position={new UDim2(0, 0, 0, 36)}
                                Size={new UDim2(1, 0, 0, 36 * this.props.options.size())}
                            >
                                {this.props.options.map((option, index) => (
                                    <textbutton
                                        Key={option}
                                        Size={new UDim2(1, 0, 0, 36)}
                                        Position={new UDim2(0, 0, 0, 36 * index)}
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
