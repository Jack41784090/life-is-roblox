import Roact, { Portal } from "@rbxts/roact";
import { Players, RunService, UserInputService } from "@rbxts/services";
import BattleCamera from "shared/class/BattleCamera";
import { getMouseWorldPosition } from "shared/func";

export interface BattleDDProps {
    options: ReadonlyArray<string>;
    battleCamera: BattleCamera;
    raycast?: Vector3;
}

interface BattleDDState {
    isOnScreen: boolean;
    isOpen: boolean;
    selectedOption: string;
    screenPosition: Vector2;
    worldPosition: Vector3;
}

export default class BattleDD extends Roact.Component<BattleDDProps, BattleDDState> {
    private dropDownFrame: Roact.Ref<Frame>;
    private panScript?: RBXScriptConnection;
    private outsideClickConnection?: RBXScriptConnection;
    private debounce = false;

    constructor(props: BattleDDProps) {
        super(props);
        this.dropDownFrame = Roact.createRef<Frame>();
        this.state = {
            isOnScreen: true,
            isOpen: false,
            selectedOption: "",
            screenPosition: UserInputService.GetMouseLocation(),
            worldPosition: new Vector3(),
        };
        this.initializeWorldPosition();
        this.connectPanScript();
    }

    private initializeWorldPosition() {
        const rayCastVector = this.props.raycast ?? getMouseWorldPosition(this.props.battleCamera.camera, Players.LocalPlayer.GetMouse());
        if (!rayCastVector) return;
        this.setState({ worldPosition: rayCastVector });
        print(this.state.worldPosition);
    }

    private connectPanScript() {
        this.panScript = RunService.RenderStepped.Connect(() => {
            if (!this.state.worldPosition) return;
            const [screenPoint, onScreen] = this.props.battleCamera.camera.WorldToScreenPoint(this.state.worldPosition);
            if (onScreen &&
                (screenPoint.X !== this.state.screenPosition.X || screenPoint.Y !== this.state.screenPosition.Y)) {
                this.setState({ screenPosition: new Vector2(screenPoint.X, screenPoint.Y) });
            }
            if (onScreen !== this.state.isOnScreen) {
                this.setState({ isOnScreen: onScreen });
            }
        });
    }

    protected willUnmount(): void {
        this.panScript?.Disconnect();
        this.outsideClickConnection?.Disconnect();
    }

    private debounceToggleDropdown() {
        if (this.debounce) return;
        this.debounce = true;
        this.toggleDropdown();
        task.delay(0.3, () => (this.debounce = false)); // Debounce delay of 0.3 seconds
    }

    private close() {
        const ddFrame = this.dropDownFrame.getValue();
        if (ddFrame) {
            ddFrame.TweenSize(
                new UDim2(0, 200, 0, 36),
                Enum.EasingDirection.InOut,
                Enum.EasingStyle.Linear,
                0.2,
                true,
                () => {
                    this.setState({
                        isOpen: false,
                    });
                }
            );
        }
    }

    private open() {
        this.setState({
            isOpen: true,
        });
        const ddFrame = this.dropDownFrame.getValue();
        if (ddFrame) {
            ddFrame.TweenSize(
                new UDim2(0, 200, 0, 36 * this.props.options.size()),
                Enum.EasingDirection.InOut,
                Enum.EasingStyle.Linear,
                0.2,
                true,
            );
        }
    }

    private toggleDropdown() {
        const isAlreadyOpen = this.state.isOpen;
        const ddFrame = this.dropDownFrame.getValue();
        if (isAlreadyOpen) {
            this.setState({
                isOpen: false,
            });
        }

        if (ddFrame) {
            const targetSize = isAlreadyOpen ? 1 : this.props.options.size() + 1;
            ddFrame.TweenSize(
                new UDim2(0, 200, 0, 36 * targetSize),
                Enum.EasingDirection.InOut,
                Enum.EasingStyle.Linear,
                0.2,
                true,
                () => {
                    if (isAlreadyOpen) {
                        this.outsideClickConnection?.Disconnect();
                    } else {
                        this.setupOutsideClickListener();
                        this.setState({
                            isOpen: true,
                        });
                    }
                }
            );
        }
    }

    private setupOutsideClickListener() {
        this.outsideClickConnection = UserInputService.InputBegan.Connect((input) => {
            const ddFrame = this.dropDownFrame.getValue();

            // Ensure the input is a mouse click
            if (input.UserInputType === Enum.UserInputType.MouseButton1 && ddFrame) {
                const mouse = Players.LocalPlayer.GetMouse();
                // Check if the target of the input is not a descendant of the dropdown frame;
                if (!mouse.Target?.IsDescendantOf(ddFrame)) {
                    this.close();
                    this.outsideClickConnection?.Disconnect();
                }
            }
        });
    }

    private handleOptionClick(option: string) {
        this.setState({
            selectedOption: option,
        });
        this.debounceToggleDropdown();
    }

    private handleToggleClick() {
        this.debounceToggleDropdown();
    }

    render() {
        if (this.state.isOnScreen === false) return undefined;
        return (
            <Portal target={Players.LocalPlayer.WaitForChild("PlayerGui")}>
                <screengui Key="dropdown-gui" IgnoreGuiInset={true} DisplayOrder={1}>
                    <frame
                        Key="dropdown"
                        BorderSizePixel={0}
                        Size={new UDim2(0, 200, 0, 36)}
                        Ref={this.dropDownFrame}
                        Position={new UDim2(0, this.state.screenPosition.X, 0, this.state.screenPosition.Y)}
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
