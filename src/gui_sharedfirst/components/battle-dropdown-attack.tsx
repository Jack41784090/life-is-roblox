
import Roact from "@rbxts/roact";
import { TweenService } from "@rbxts/services";
import Ability from "shared/class/Ability";
import Battle from "shared/class/Battle";
import { IDGenerator } from "shared/class/IDGenerator";
import { DropdownmenuContext } from "shared/types/battle-types";

export interface BattleDDAttackElementProps {
    ctx: DropdownmenuContext;
    battle: Battle;
}
interface BattleDDAttackElementState {
    ref: Roact.Ref<Frame>;
    menuFramePos: UDim2;
}

export default class BattleDDAttackElement extends Roact.Component<BattleDDAttackElementProps, BattleDDAttackElementState> {
    private v2vPos: Vector3Value = new Instance("Vector3Value");
    // private onAttackAbilityClicked = this.props.onAttackAbilityClickedSignal;

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
        const allAbilities = this.props.ctx.initiator.getAbilities(); print(allAbilities)
        const attacker = this.props.ctx.initiator;
        const target = this.props.ctx.cell.entity!;
        const attackerCellCoords = attacker.cell?.xy;
        const targetCellCoords = target.cell?.xy;
        if (!attackerCellCoords || !targetCellCoords) {
            return undefined;
        }

        const reachableAbilities = allAbilities.filter(a => {
            const range = a.range;
            const distance = attackerCellCoords.sub(targetCellCoords).Magnitude;
            return range.min <= distance && distance <= range.max;
        })
        const abilityButtonElements = reachableAbilities.map(a => {
            return <textbutton
                Key={a.name}
                Position={new UDim2(0, 0, 0, 0)}
                Size={UDim2.fromScale(1, 1)}
                Event={{
                    MouseButton1Click: () => {
                        print("Clicked on " + a.name);
                        const ability = new Ability({
                            name: a.name,
                            description: a.description,
                            acc: a.acc,
                            cost: a.cost,
                            potencies: a.potencies,
                            damageType: a.damageType,
                            using: this.props.ctx.initiator,
                            target: target,
                            range: a.range
                        });
                        this.props.battle.onAttackClickedSignal.Fire(ability);
                    },

                    MouseEnter: () => {
                        print("Hovered on " + a.name);
                        //#region  defence
                        if (!attacker.cell) {
                            warn("attackmenu hover: attacker cell not found");
                            return;
                        }
                        //#endregion
                        this.props.battle.gui?.mountOrUpdateGlowRange(attacker.cell, a.range);
                    }
                }}
                Text={a.name}
            />
        });

        if (reachableAbilities.size() === 0) {
            return undefined;
        }

        return (
            <frame Key={"attack-menu-" + IDGenerator.generateID()}
                Size={UDim2.fromScale(1, 1)}
                Position={UDim2.fromScale(this.v2vPos.Value.X, this.v2vPos.Value.Y)}
                Ref={this.state.ref}
            >
                {abilityButtonElements}
            </frame>
        );
    }
}