import Roact from "@rbxts/roact";
import { TweenService } from "@rbxts/services";
import MenuFrameElement from "shared/gui/components/menu";
import ReadinessBarElement from "shared/gui/components/readinessBar";
import { ReadinessIcon } from "shared/types/battle-types";

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

    tweenToUpdate(newReadinessIcons: ReadinessIcon[]) {
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
        }
    }
}
