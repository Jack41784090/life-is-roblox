import Roact from "@rbxts/roact";
import { TweenService } from "@rbxts/services";
import ButtonElement from "gui_sharedfirst/components/button";
import ButtonFrameElement from "gui_sharedfirst/components/button-frame";
import CellGlowSurfaceElement from "gui_sharedfirst/components/cell-glow-surface";
import CellSurfaceElement from "gui_sharedfirst/components/cell-surface";
import MenuFrameElement from "gui_sharedfirst/components/menu";
import ReadinessBarElement from "gui_sharedfirst/components/readinessBar";
import { EntityActionOptions } from "shared/types/battle-types";
import { Battle } from "./Battle";
import Entity from "./Entity";
import Pathfinding from "./Pathfinding";


export default class BattleGUI {
    private ui: Roact.Tree;
    private glowPath: Roact.Tree | undefined;
    private readinessIcons: Roact.Ref<ImageLabel>[];
    private static battleinstance: Battle;
    private static instance: BattleGUI;

    static getBattle() {
        return BattleGUI.battleinstance;
    }
    static getInstance() {
        return BattleGUI.instance;
    }

    static Start(battle: Battle) {
        if (!BattleGUI.instance) {
            BattleGUI.instance = new BattleGUI(battle);
        }
        return BattleGUI.instance;
    }

    private constructor(battle: Battle) {
        BattleGUI.battleinstance = battle;
        const readinessIcons = battle.getReadinessIcons();
        this.readinessIcons = readinessIcons.map(() => Roact.createRef<ImageLabel>());
        const ui = Roact.mount(
            <MenuFrameElement transparency={1}>
                <ReadinessBarElement icons={readinessIcons} ref={this.readinessIcons} />
                <>
                    {battle.grid.cells.map(c =>
                        <CellSurfaceElement
                            cell={c}
                            onEnter={() => {
                                print(`Clicked on cell ${c.xy.X}, ${c.xy.Y}`);
                                if (!battle.currentRoundEntity) return;

                                const pf = Pathfinding.Start({
                                    grid: battle.grid,
                                    start: battle.currentRoundEntity.cell!.xy,
                                    dest: c.xy,
                                })

                                this.glowAlongPath(pf.fullPath);
                            }}
                        />)}
                </>
            </MenuFrameElement >
        );
        this.ui = ui;
    }

    tweenToUpdateReadiness() {
        const newReadinessIcons = BattleGUI.battleinstance.getReadinessIcons();
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

    glowAlongPath(path: Vector2[]) {
        if (this.glowPath) {
            return Roact.update(this.glowPath,
                <>
                    {path.mapFiltered((xy, index) => {
                        const cell = BattleGUI.battleinstance.grid.getCell(xy.X, xy.Y);
                        if (!cell) return;
                        cell.glow = true;
                        return <CellGlowSurfaceElement
                            cell={cell}
                        >
                        </CellGlowSurfaceElement>
                    })}
                </>);
        }
        else {
            return this.glowPath = Roact.mount(
                <>
                    {path.mapFiltered((xy, index) => {
                        const cell = BattleGUI.battleinstance.grid.getCell(xy.X, xy.Y);
                        if (!cell) return;
                        cell.glow = true;
                        return <CellGlowSurfaceElement
                            cell={cell}
                        >
                        </CellGlowSurfaceElement>
                    })}
                </>
            );
        }
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

    // const surfaceGui = new Instance("SurfaceGui");
    // surfaceGui.Face = Enum.NormalId.Top;
    // surfaceGui.Parent = adornee;

    // const frame = new Instance("Frame");
    // frame.Parent = surfaceGui;
    // frame.AnchorPoint = new Vector2(0.5, 0.5);
    // frame.Position = new UDim2(0.5, 0, 0.5, 0);
    // frame.Size = new UDim2(1, 0, 1, 0);
    // frame.BackgroundColor3 = new Color3(255 / 255, 58 / 255, 58 / 255);
    // frame.BackgroundTransparency = 0.35;
}
