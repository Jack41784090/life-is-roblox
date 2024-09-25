import Roact, { Portal } from "@rbxts/roact";
import { Players, RunService, TweenService, UserInputService } from "@rbxts/services";
import Battle from "shared/class/Battle";
import Cell from "shared/class/Cell";
import { getMouseWorldPosition } from "shared/func";
import { DropmenuAction, DropmenuActionType } from "shared/types/battle-types";

export interface BattleDDProps {
    options: ReadonlyArray<DropmenuAction>;
    cell: Cell;
    battle: Battle;
    mouseLocation: Vector2;
}

interface BattleDDState {
    options: ReadonlyArray<DropmenuAction>;
    isOnScreen: boolean;
}

export default class BattleDD extends Roact.Component<BattleDDProps, BattleDDState> {
    private isWithinFrame = false;
    private initWorldPosition: Vector3;
    private dropdownFrameRef: Roact.Ref<Frame>;
    private panConnection?: RBXScriptConnection;
    private outsideClickConnection?: RBXScriptConnection;

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

        const gui = this.props.battle.gui;
        if (gui) {
            gui.unmountAndClear("glowPathGui");
            gui.updateMainUI("onlyReadinessBar");
        }

        const wp = getMouseWorldPosition(this.props.battle.bcamera.camera, Players.LocalPlayer.GetMouse());
        this.initWorldPosition = wp ? wp : new Vector3();
        this.connectPanScript();
    }

    protected didUpdate(previousProps: BattleDDProps, previousState: BattleDDState): void {
        if (previousProps.mouseLocation !== this.props.mouseLocation) {
            this.tweenFrameSize();
        }
    }

    protected didMount(): void {
        this.setupOutsideClickListener();
        this.tweenFrameSize();
    }

    protected willUnmount(): void {
        this.panConnection?.Disconnect();
        this.outsideClickConnection?.Disconnect();
        this.props.battle.gui?.updateMainUI("withSensitiveCells");
    }

    private connectPanScript() {
        this.panConnection?.Disconnect();
        this.panConnection = RunService.RenderStepped.Connect(() => {
            this.positionDropdownMenu();
        });
    }

    private positionDropdownMenu() {
        const ddFrame = this.dropdownFrameRef.getValue();
        if (!ddFrame) {
            warn("Dropdown frame not found");
            return;
        }

        // Get the mouse location and position the dropdown accordingly
        const [mouseLocation, onScreen] = this.props.battle.bcamera.camera.WorldToScreenPoint(this.initWorldPosition);
        if (this.state.isOnScreen !== onScreen) {
            this.setState({ isOnScreen: onScreen });
        }

        // Adjust for the top bar (36 pixels)
        const adjustedPosition = new UDim2(0, mouseLocation.X, 0, mouseLocation.Y - 36);
        ddFrame.Position = adjustedPosition;
    }

    private setupOutsideClickListener() {
        this.outsideClickConnection = UserInputService.InputBegan.Connect((input) => {
            const persistCondition =
                !this.isWithinFrame ||
                this.state.options.some(o => o.onClickChain?.isHovering);
            if (input.UserInputType === Enum.UserInputType.MouseButton1 && persistCondition) {
                warn("Outside click detected");
                this.props.battle.gui?.unmountAndClear("dropDownMenuGui");
            }
        });
    }

    private tweenFrameSize() {
        const ddFrame = this.dropdownFrameRef.getValue();
        if (!ddFrame) {
            warn("Dropdown frame not found");
            return;
        }

        const tweenTime = 0.2;
        const targetSize = UDim2.fromOffset(200, this.state.options.size() * 36);

        ddFrame.Size = UDim2.fromOffset(200, 0); // Initial size
        TweenService.Create(
            ddFrame,
            new TweenInfo(tweenTime, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
            { Size: targetSize },
        ).Play();
    }

    private handleOptionClick(optionName: string) {
        const initiator = this.props.battle.currentRound?.entity;
        const selectedAction = this.state.options.find((action) => action.name === optionName);

        if (selectedAction && initiator) {
            selectedAction.run({
                cell: this.props.cell,
                initiator,
                dropdownMenu: this,
                occ: selectedAction,
            });

            if (selectedAction.onClickChain) {
                selectedAction.onClickChain.isRendering = !selectedAction.onClickChain.isRendering;
                this.setState({
                    options: this.state.options.map((action) =>
                        action.name === optionName ? selectedAction : action,
                    ),
                });
            }
        } else {
            warn(
                "Dropdown menu: Selected action or current-round initiator not found",
                selectedAction,
                initiator,
            );
        }
    }

    private getOptionButtons() {
        const currentEntity = this.props.battle.currentRound?.entity;

        return this.state.options.map((option) => (
            <textbutton
                Key={option.name}
                Size={new UDim2(1, 0, 0, 36)}
                BackgroundColor3={new Color3(1, 1, 1)}
                TextColor3={new Color3(0, 0, 0)}
                Event={{
                    MouseButton1Click: () => this.handleOptionClick(option.name),
                }}
                Text={option.name}
            >
                {option.onClickChain?.isRendering &&
                    currentEntity &&
                    option.onClickChain.render({
                        occ: option,
                        dropdownMenu: this,
                        initiator: currentEntity,
                        cell: this.props.cell,
                    })}
            </textbutton>
        ));
    }

    public setOptionAsHovering(optionName: DropmenuActionType, hovering: boolean) {
        this.setState({
            options: this.state.options.map((option) => {
                if (option.name === optionName) {
                    if (option.onClickChain) {
                        option.onClickChain.isHovering = hovering;
                    }
                }
                return option;
            }),
        })
    }

    public render() {
        return (
            <Portal target={Players.LocalPlayer.WaitForChild("PlayerGui")}>
                <screengui Key="dropdown-gui" IgnoreGuiInset={true} DisplayOrder={1}>
                    <frame
                        Key="bg"
                        AnchorPoint={new Vector2(0.5, 0.5)}
                        BorderSizePixel={0}
                        Size={UDim2.fromOffset(200, 0)} // Initial size; will be tweened
                        Ref={this.dropdownFrameRef}
                        Position={UDim2.fromScale(0.5, 0.5)} // Temporary position; will be updated in didMount
                        BackgroundColor3={new Color3(0, 0, 0)}
                        Transparency={this.state.isOnScreen ? 0 : 1}
                    >
                        <uicorner CornerRadius={new UDim(0.05, 0)} />
                        <uipadding PaddingLeft={new UDim(0.05, 0)} PaddingRight={new UDim(0.05, 0)} />
                        <frame
                            Key="dropdown"
                            BorderSizePixel={0}
                            AnchorPoint={new Vector2(0.5, 0.5)}
                            Position={UDim2.fromScale(0.5, 0.5)}
                            Size={UDim2.fromScale(1, 1)}
                            BackgroundColor3={new Color3(0.2, 0.2, 0.2)}
                            Event={{
                                MouseEnter: () => (this.isWithinFrame = true),
                                MouseLeave: () => (this.isWithinFrame = false),
                            }}
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
