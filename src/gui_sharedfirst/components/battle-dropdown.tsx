import Roact, { Portal } from "@rbxts/roact";
import { Players, RunService, TweenService, UserInputService } from "@rbxts/services";
import { Battle } from "shared/class/Battle";
import Cell from "shared/class/Cell";
import { getMouseWorldPosition } from "shared/func";
import { DropmenuAction } from "shared/types/battle-types";

export interface BattleDDProps {
    options: ReadonlyArray<DropmenuAction>;
    cell: Cell
    battle: Battle
}

interface BattleDDState {
    options: ReadonlyArray<DropmenuAction>;
    isOnScreen: boolean;
}

export default class BattleDD extends Roact.Component<BattleDDProps, BattleDDState> {
    screenPosition: Vector2;
    worldPosition?: Vector3;
    private v2vFrameSize: Vector3Value; // tweenable size for the main frame

    private isWithinFrame = false;
    private dropdownFrameRef: Roact.Ref<Frame>;
    private panScript?: RBXScriptConnection;
    private outsideClickSCript?: RBXScriptConnection;

    constructor(props: BattleDDProps) {
        super(props);
        this.dropdownFrameRef = Roact.createRef<Frame>();

        if (this.props.options.size() === 0) {
            warn("No options provided for dropdown menu");
        }

        this.state = {
            isOnScreen: true,
            options: this.props.options,
        };
        this.initializeWorldPosition();
        this.connectPanScript();
        this.setupOutsideClickListener();

        this.screenPosition = UserInputService.GetMouseLocation();

        const gui = this.props.battle.gui;
        if (gui) {
            gui.unmountAndClear('glowPathGui')
            gui.updateMainUI('onlyReadinessBar')
        }

        this.v2vFrameSize = new Instance("Vector3Value");
        this.v2vFrameSize.Value = new Vector3(200, 0, 0);
    }

    private initializeWorldPosition() {
        const bc = this.props.battle.bcamera;
        const rayCastVector = getMouseWorldPosition(bc.camera, Players.LocalPlayer.GetMouse());
        if (!rayCastVector) return;
        this.worldPosition = rayCastVector;
    }

    private connectPanScript() {
        this.panScript?.Disconnect();
        this.panScript = RunService.RenderStepped.Connect(() => {
            const frame = this.dropdownFrameRef.getValue();
            if (!this.worldPosition) {
                warn("dropdownmenu world pos not set");
                this.initializeWorldPosition();
                if (!this.worldPosition) return;
            }
            const bc = this.props.battle.bcamera;
            const [screenPoint, onScreen] = bc.camera.WorldToScreenPoint(this.worldPosition);
            if (this.screenPosition && onScreen && (screenPoint.X !== this.screenPosition.X || screenPoint.Y !== this.screenPosition.Y)) {
                this.screenPosition = new Vector2(screenPoint.X, screenPoint.Y);
                if (frame) frame.Position = UDim2.fromOffset(this.screenPosition.X, this.screenPosition.Y);
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
            UDim2.fromOffset(200, this.state.options.size() * 36),
            Enum.EasingDirection.Out,
            Enum.EasingStyle.Quad,
            tweenTime,
            true
        )
        TweenService.Create(
            this.v2vFrameSize,
            new TweenInfo(tweenTime, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
            { Value: new Vector3(200, this.state.options.size() * 36, 0) }
        )
            .Play();
    }

    protected willUnmount(): void {
        this.panScript?.Disconnect();
        this.outsideClickSCript?.Disconnect();
        this.props.battle.gui?.updateMainUI('withSensitiveCells')
    }

    private setupOutsideClickListener() {
        wait(0.1);
        // this.outsideClickSCript = UserInputService.InputBegan.Connect((input) => {
        //     if (input.UserInputType === Enum.UserInputType.MouseButton1 && this.isWithinFrame === false) {
        //         this.props.battle.gui?.unmountAndClear('dropDownMenuGui');
        //     }
        // });
    }

    private handleOptionClick(optionClickedName: string) {
        const initiator = this.props.battle.currentRound?.entity;
        const selectedAction = this.state.options.find((action) => action.name === optionClickedName);
        if (selectedAction && initiator) {
            selectedAction.run({
                cell: this.props.cell,
                initiator: initiator
            });
            if (selectedAction.onClickChain) {
                selectedAction.onClickChain.isRendering = !selectedAction.onClickChain.isRendering;
                this.setState({
                    options: this.state.options.map((action) => action.name === optionClickedName ? selectedAction : action)
                })
            }
        }
        else {
            warn("dropdown menu: Selected action or current-round initiator not found", selectedAction, initiator);
        }
    }


    getOptionButtons() {
        const crEntity = this.props.battle.currentRound?.entity;
        return this.state.options.map((option, index) => (
            <textbutton
                Key={option.name}
                Size={UDim2.fromScale(1, 1 / this.state.options.size())}
                Position={UDim2.fromOffset(0, 36 * index)}
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
        ));
    }

    render() {
        // print("Rendering dropdown");
        if (this.state.isOnScreen === false) {
            return undefined;
        }

        return (
            <Portal target={Players.LocalPlayer.WaitForChild("PlayerGui")}>
                <screengui Key="dropdown-gui" IgnoreGuiInset={true} DisplayOrder={1}>
                    <frame
                        AnchorPoint={new Vector2(0.5, 0.5)}
                        Key={"bg"}
                        BorderSizePixel={0}
                        Size={UDim2.fromOffset(this.v2vFrameSize.Value.X, this.v2vFrameSize.Value.Y)}
                        Ref={this.dropdownFrameRef}
                        Position={UDim2.fromOffset(this.screenPosition.X, this.screenPosition.Y)}
                        BackgroundColor3={new Color3(0, 0, 0)}
                    >
                        <uicorner CornerRadius={new UDim(0.05, 0)} />
                        <uipadding PaddingLeft={new UDim(.05)} PaddingRight={new UDim(.05)} />
                        <frame
                            Key="dropdown"
                            BorderSizePixel={0}
                            AnchorPoint={new Vector2(0.5, 0.5)}
                            Position={UDim2.fromScale(0.5, 0.5)}
                            Size={UDim2.fromScale(1, .95)}
                            Event={{
                                MouseEnter: () => this.isWithinFrame = true,
                                MouseLeave: () => this.isWithinFrame = false,
                            }}
                            BackgroundColor3={new Color3(0, 0, 0)}
                        >
                            <uilistlayout FillDirection={Enum.FillDirection.Vertical} />
                            {this.getOptionButtons()}
                        </frame>
                    </frame>
                </screengui>
            </Portal>
        );
    }
}
