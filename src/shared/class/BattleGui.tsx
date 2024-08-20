import Roact from "@rbxts/roact";
import { TweenService } from "@rbxts/services";
import ButtonElement from "gui_sharedfirst/components/button";
import ButtonFrameElement from "gui_sharedfirst/components/button-frame";
import MenuFrameElement from "gui_sharedfirst/components/menu";
import ReadinessBarElement from "gui_sharedfirst/components/readinessBar";
import { EntityActionOptions, ReadinessIcon } from "shared/types/battle-types";
import Entity from "./Entity";


export default class BattleGUI {
    private ui: Roact.Tree;
    private readinessIcons: Roact.Ref<ImageLabel>[];
    private static instance: BattleGUI;

    static Start(readinessIcons: ReadinessIcon[]) {
        if (!BattleGUI.instance) {
            BattleGUI.instance = new BattleGUI(readinessIcons);
        }
        return BattleGUI.instance;
    }

    private constructor(readinessIcons: ReadinessIcon[]) {
        this.readinessIcons = readinessIcons.map(() => Roact.createRef<ImageLabel>());
        const ui = Roact.mount(
            <MenuFrameElement transparency={1}>
                <ReadinessBarElement icons={readinessIcons} ref={this.readinessIcons} />
            </MenuFrameElement >
        );
        this.ui = ui;
    }

    tweenToUpdateReadiness(newReadinessIcons: ReadinessIcon[]) {
        const promiseAll: Promise<unknown>[] = [];
        for (let i = 0; i < this.readinessIcons.size(); i++) {
            const icon = this.readinessIcons[i];
            const val = icon.getValue();
            if (!val) continue;

            const t = TweenService.Create(
                val,
                new TweenInfo(0.5, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut),
                {
                    Position: UDim2.fromScale(0, newReadinessIcons[i].readiness),
                });
            t.Play();
            promiseAll.push(new Promise((resolve) => t.Completed.Connect(resolve)));
        }
        return Promise.all(promiseAll);
    }

    showEntityActionOptions(entity: Entity, callback?: (action: EntityActionOptions) => void) {
        const actions = entity.getActions();
        const actionOptions = actions.map((action, index) => {
            return <ButtonElement
                Key={index}
                position={index * 1 / actions.size()}
                size={1 / actions.size()}
                onclick={() => {
                    action.action();
                    if (callback) {
                        callback({
                            type: action.type,
                            ui: ui
                        });
                    }
                }}
                text={action.type}
                transparency={0.9}
            />;
        });
        const ui = Roact.mount(
            <MenuFrameElement transparency={1}>
                <ButtonFrameElement>
                    {actionOptions}
                </ButtonFrameElement>
            </MenuFrameElement>
        );
    }
}
