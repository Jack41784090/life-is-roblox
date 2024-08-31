import Roact, { Portal } from "@rbxts/roact";
import { Players, RunService, UserInputService } from "@rbxts/services";
import BattleCamera from "shared/class/BattleCamera";
import BattleGUI from "shared/class/BattleGui";
import Cell from "shared/class/Cell";
import { getMouseWorldPosition } from "shared/func";
import { DropmenuAction } from "shared/types/battle-types";

export interface BattleDDProps {
    options: ReadonlyArray<DropmenuAction>;
    battleCamera: BattleCamera;
    cell: Cell
    gui: BattleGUI
}

interface BattleDDState {
    isOnScreen: boolean;
    isOpen: boolean;
    selectedOption: string;
    screenPosition: Vector2;
    worldPosition: Vector3;
}

export default class BattleDD extends Roact.Component<BattleDDProps, BattleDDState> {
    private isWithinFrame = false;
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
        this.setupOutsideClickListener();

        const gui = this.props.gui;
        gui.unmountAndClear('glowPathGui')
        gui.renderWithOnlyReadinessBar();
    }

    private initializeWorldPosition() {
        const rayCastVector = getMouseWorldPosition(this.props.battleCamera.camera, Players.LocalPlayer.GetMouse());
        if (!rayCastVector) return;
        this.setState({ worldPosition: rayCastVector });
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
        this.props.gui.renderWithSensitiveCells();
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
                        this.setState({
                            isOpen: true,
                        });
                    }
                }
            );
        }
    }

    private setupOutsideClickListener() {
        wait(0.1);
        this.outsideClickConnection = UserInputService.InputBegan.Connect((input) => {
            if (input.UserInputType === Enum.UserInputType.MouseButton1 && this.isWithinFrame === false) {
                this.props.gui.unmountAndClear('dropDownMenuGui');
            }
        });
    }

    private handleOptionClick(option: string) {
        this.setState({
            selectedOption: option,
        });
        this.debounceToggleDropdown();
        const selectedAction = this.props.options.find((action) => action.name === option);
        if (selectedAction) selectedAction.run(this.props.cell);
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
                        Event={{
                            MouseEnter: () => this.isWithinFrame = true,
                            MouseLeave: () => this.isWithinFrame = false,
                        }}
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
                                        Key={option.name}
                                        Size={new UDim2(1, 0, 0, 36)}
                                        Position={new UDim2(0, 0, 0, 36 * index)}
                                        Event={{
                                            MouseButton1Click: () => this.handleOptionClick(option.name),
                                        }}
                                        Text={option.name}
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
