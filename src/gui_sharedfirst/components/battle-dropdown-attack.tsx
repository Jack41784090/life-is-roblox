
import Roact from "@rbxts/roact";
import { TweenService } from "@rbxts/services";
import { IDGenerator } from "shared/class/IDGenerator";
import { DropdownmenuContext } from "shared/types/battle-types";

export interface BattleDDAttackElementProps {
    ctx: DropdownmenuContext;
}
interface BattleDDAttackElementState {
    ref: Roact.Ref<Frame>;
    menuFramePos: UDim2;
}

export default class BattleDDAttackElement extends Roact.Component<BattleDDAttackElementProps, BattleDDAttackElementState> {
    private v2vPos: Vector3Value = new Instance("Vector3Value");
    constructor(props: BattleDDAttackElementProps) {
        super(props);
        this.state = {
            ref: Roact.createRef<Frame>(),
            menuFramePos: UDim2.fromScale(0, 0)
        }
    }

    protected didMount(): void {
        const tweenTime = .2;
        this.v2vPos = new Instance("Vector3Value");
        const vcs = this.v2vPos.GetPropertyChangedSignal("Value").Connect(() => {
            const x = this.state.ref.getValue();
            if (x) {
                x.Position = UDim2.fromScale(this.v2vPos.Value.X, this.v2vPos.Value.Y);
            }
        });
        const tsc = TweenService.Create(
            this.v2vPos,
            new TweenInfo(tweenTime, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
            { Value: new Vector3(1.05, 0) }
        )
        tsc.Play();
        task.spawn(() => {
            tsc.Completed.Wait();
            vcs.Disconnect();
        })
    }

    render() {
        return (
            <frame Key={"attack-menu-" + IDGenerator.generateID()}
                Size={UDim2.fromScale(1, 1)}
                // Position={UDim2.fromScale(this.v2vPos.Value.X, this.v2vPos.Value.Y)}
                Position={UDim2.fromScale(this.v2vPos.Value.X, this.v2vPos.Value.Y)}
                Ref={this.state.ref}
            >
                {
                    this.props.ctx.initiator.getAbilities().map(a => {
                        return <textbutton
                            Key={a.name}
                            Position={new UDim2(0, 0, 0, 0)}
                            Size={UDim2.fromScale(1, 1)}
                            Event={{
                                MouseButton1Click: () => {
                                    print("Clicked on " + a.name);
                                }
                            }}
                            Text={a.name}
                        />
                    })
                }
            </frame>
        );
    }
}