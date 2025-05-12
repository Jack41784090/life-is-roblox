import { RunService, TweenService } from "@rbxts/services";

export default class TweenManager {
    private tweenQueue: Tween[] = [];
    playing: boolean = false;
    handleScript: RBXScriptConnection;

    constructor() {
        this.handleScript = RunService.RenderStepped.Connect(() => {
            if (this.playing) return;
            this.tweenQueue = this.tweenQueue.filter(tween => tween.PlaybackState === Enum.PlaybackState.Begin);
            const q = this.tweenQueue;
            const t = q.shift();
            if (t) {
                this.playing = true;
                t.Play();
                t.Completed.Wait();
                this.playing = false;
            }
        });
    }

    addTween(tween: Tween) {
        this.tweenQueue.push(tween);
    }

    async waitForCompletion(tween: Tween) {
        return tween.Completed.Wait();
    }

    createTween(modelPrimaryPart: BasePart, targetCFrame: CFrame, duration: number): Tween {
        return TweenService.Create(
            modelPrimaryPart,
            new TweenInfo(duration, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut),
            { CFrame: targetCFrame }
        );
    }
}