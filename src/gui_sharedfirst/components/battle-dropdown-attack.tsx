
import Roact from "@rbxts/roact";
import { TweenService } from "@rbxts/services";
import Ability from "shared/class/Ability";
import Battle from "shared/class/Battle";
import { IDGenerator } from "shared/class/IDGenerator";
import { DropdownmenuContext, DropmenuActionType } from "shared/types/battle-types";
import BattleDDElement from "./battle-dropdown";

export interface BattleDDAttackElementProps {
    ctx: DropdownmenuContext;
    battle: Battle;
    dropdownMenu: BattleDDElement;
}
interface BattleDDAttackElementState { }

export default class BattleDDAttackElement extends Roact.Component<BattleDDAttackElementProps, BattleDDAttackElementState> {
    private position: NumberValue;
    private frameRef: Roact.Ref<Frame>;

    constructor(props: BattleDDAttackElementProps) {
        super(props);
        this.frameRef = Roact.createRef();
        this.position = new Instance("NumberValue");
    }

    private tweenFrameSize() {
        const tweenTime = 0.2;
        const targetX = 1.05
        this.position.Value = 0; // Initial size
        TweenService.Create(
            this.position,
            new TweenInfo(tweenTime, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
            { Value: targetX }
        ).Play()
    }

    protected didMount(): void {
        this.tweenFrameSize();
    }

    public render() {
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
                Size={UDim2.fromScale(1, 1)}
                Event={{
                    MouseButton1Click: () => {
                        print("Clicked on " + a.name);
                        const ability = new Ability({
                            ...a,
                            using: attacker,
                            target: target,
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

                        this.props.dropdownMenu.setOptionAsHovering(DropmenuActionType.Attack, true);
                        this.props.battle.gui?.mountOrUpdateGlowRange(attacker.cell, a.range);
                    },
                    MouseLeave: () => {
                        print("Left " + a.name);
                        this.props.dropdownMenu.setOptionAsHovering(DropmenuActionType.Attack, false);
                        this.props.battle.gui?.unmountAndClear('glowPathGui')
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
                Size={UDim2.fromScale(1, abilityButtonElements.size())}
                Position={UDim2.fromScale(this.position.Value, 0)}
                Ref={this.frameRef}
            >
                {abilityButtonElements}
            </frame>
        );
    }
}