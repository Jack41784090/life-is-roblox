import Roact, { Portal } from "@rbxts/roact";
import { Players, RunService, TweenService, UserInputService } from "@rbxts/services";
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
    screenPosition: Vector2;
    worldPosition: Vector3;
    options: ReadonlyArray<DropmenuAction>;
}

export default class BattleDD extends Roact.Component<BattleDDProps, BattleDDState> {
    private isWithinFrame = false;
    private dropdownFrameRef: Roact.Ref<Frame>;
    private panScript?: RBXScriptConnection;
    private outsideClickConnection?: RBXScriptConnection;
    private v2vSize: Vector3Value;

    constructor(props: BattleDDProps) {
        super(props);
        this.dropdownFrameRef = Roact.createRef<Frame>();
        this.state = {
            isOnScreen: true,
            screenPosition: UserInputService.GetMouseLocation(),
            worldPosition: new Vector3(),
            options: this.props.options,
        };
        this.initializeWorldPosition();
        this.connectPanScript();
        this.setupOutsideClickListener();

        const gui = this.props.gui;
        gui.unmountAndClear('glowPathGui')
        gui.renderWithOnlyReadinessBar();

        this.v2vSize = new Instance("Vector3Value");
        this.v2vSize.Value = new Vector3(200, 0, 0);
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

    protected didMount(): void {
        const ddFrame = this.dropdownFrameRef.getValue();
        if (!ddFrame) {
            warn("Dropdown frame not found");
            return;
        }

        const tweenTime = 0.2;
        ddFrame.TweenSize(
            new UDim2(0, 200, 0, this.state.options.size() * 36),
            Enum.EasingDirection.Out,
            Enum.EasingStyle.Quad,
            tweenTime,
            true
        )
        TweenService.Create(
            this.v2vSize,
            new TweenInfo(tweenTime, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
            { Value: new Vector3(200, this.state.options.size() * 36, 0) }
        )
            .Play();
    }

    protected willUnmount(): void {
        this.panScript?.Disconnect();
        this.outsideClickConnection?.Disconnect();
        this.props.gui.renderWithSensitiveCells();
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
        const initiator = this.props.gui.igetBattle().currentRound?.entity;
        const selectedAction = this.state.options.find((action) => action.name === option);
        if (selectedAction?.onClickChain) {
            selectedAction.onClickChain.isRendering = !selectedAction.onClickChain.isRendering;
            this.setState({
                options: this.state.options.map((action) => action.name === option ? selectedAction : action)
            })
        }
        if (selectedAction && initiator) {
            selectedAction.run({
                cell: this.props.cell,
                initiator: initiator
            });
        }
        else {
            warn("dropdown menu: Selected action or current-round initiator not found", selectedAction, initiator);
        }
    }

    render() {
        // print("Rendering dropdown");
        if (this.state.isOnScreen === false) {
            return undefined;
        }

        const v2vSize = this.v2vSize.Value;
        const crEntity = this.props.gui.igetBattle().currentRound?.entity;

        return (
            <Portal target={Players.LocalPlayer.WaitForChild("PlayerGui")}>
                <screengui Key="dropdown-gui" IgnoreGuiInset={true} DisplayOrder={1}>
                    <frame
                        Key="dropdown"
                        BorderSizePixel={0}
                        Size={new UDim2(0, v2vSize.X, 0, v2vSize.Y)}
                        Ref={this.dropdownFrameRef}
                        // Position={new UDim2(0, this.state.screenPosition.X, 0, this.state.screenPosition.Y)}
                        Position={UDim2.fromOffset(this.state.screenPosition.X, this.state.screenPosition.Y)}
                        Event={{
                            MouseEnter: () => this.isWithinFrame = true,
                            MouseLeave: () => this.isWithinFrame = false,
                        }}
                        BackgroundColor3={new Color3(0, 0, 0)}
                    >
                        {this.state.options.map((option, index) => (
                            <textbutton
                                Key={option.name}
                                Size={new UDim2(1, 0, 1 / this.state.options.size(), 0)}
                                Position={new UDim2(0, 0, 0, 36 * index)}
                                Event={{
                                    MouseButton1Click: () => this.handleOptionClick(option.name),
                                }}
                                Text={option.name}
                            >
                                {
                                    option.onClickChain?.isRendering &&
                                    crEntity &&
                                    option.onClickChain.render({
                                        initiator: crEntity,
                                        cell: this.props.cell
                                    })
                                }
                            </textbutton>
                        ))}
                    </frame>
                </screengui>
            </Portal>
        );
    }
}
