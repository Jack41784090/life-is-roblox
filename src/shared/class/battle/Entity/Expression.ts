import Entity from ".";

export default class Expression {
    static readonly expressions: Record<string, string> = {
        'entity_adalbrecht_eye_left_neutral': 'rbxassetid://83323658516421',
        'entity_adalbrecht_eye_right_neutral': 'rbxassetid://86539013473127',
        'entity_adalbrecht_eye_left_blink': 'rbxassetid://94175562997842',
        'entity_adalbrecht_eye_right_blink': 'rbxassetid://81850963919333',
    }

    entity: Entity;
    eyes?: Part;
    leftEyeDecal?: Decal;
    rightEyeDecal?: Decal;
    closedLeftEyeTextID?: string
    closedRightEyeTextID?: string

    constructor(entity: Entity) {
        this.entity = entity;
        const model = entity.model;

        if (!model) {
            warn("No model found");
            return;
        }

        const head = model.FindFirstChild("Head") as Part;
        if (!head) {
            warn("No head found");
            return;
        }

        const eyes = head.FindFirstChild("eyes") as Part;
        this.eyes = eyes;
        if (!eyes) {
            warn("No eyes found");
            return;
        }

        this.leftEyeDecal = eyes.FindFirstChild("left eye") as Decal;
        this.rightEyeDecal = eyes.FindFirstChild("right eye") as Decal;
    }

    closeLeftEye() {
        const model = this.entity.model;
        if (this.leftEyeDecal) {
            this.closedLeftEyeTextID = this.closedLeftEyeTextID ?? Expression.expressions[`${model?.Name}_eye_left_blink`];
            if (this.closedLeftEyeTextID) {
                this.leftEyeDecal.Texture = this.closedLeftEyeTextID
            }
        }
    }

    closeRightEye() {
        const model = this.entity.model;
        if (this.rightEyeDecal) {
            this.closedRightEyeTextID = this.closedRightEyeTextID ?? Expression.expressions[`${model?.Name}_eye_right_blink`];
            if (this.closedRightEyeTextID) {
                this.rightEyeDecal.Texture = this.closedRightEyeTextID
            }
        }
    }

    openLeftEye() {
        const model = this.entity.model;
        if (this.leftEyeDecal) {
            this.leftEyeDecal.Texture = Expression.expressions[`${model?.Name}_eye_left_neutral`]
        }
    }

    openRightEye() {
        const model = this.entity.model;
        if (this.rightEyeDecal) {
            this.rightEyeDecal.Texture = Expression.expressions[`${model?.Name}_eye_right_neutral`]
        }
    }

    blink() {
        const animationHandler = this.entity.animationHandler;
        const animator = animationHandler?.animator;
        const blinkAnimation = animationHandler?.blinkAnimation;
        const newBlinkTrack = blinkAnimation ? animator?.LoadAnimation(blinkAnimation) : undefined;

        if (!animationHandler) {
            warn(`${this.entity.name}: No animation handler found`);
            return;
        }
        if (!blinkAnimation || !newBlinkTrack) {
            warn(`${this.entity.name}: No blink animation found`, blinkAnimation, newBlinkTrack);
            return;
        }
        if (!animator) {
            warn(`${this.entity.name}: No animator found`);
            return;
        }

        newBlinkTrack.Looped = false;
        animationHandler.blinkAnimationTrack = newBlinkTrack;
        animationHandler.blinkAnimationTrack.Play();

        // tween
        if (this.eyes) {
            // const closeEyeFrame = track.GetTimeOfKeyframe("CloseEye");
            // const time = closeEyeFrame / 60;
            // const tween = TweenService.Create(
            //     this.eyes,
            //     new TweenInfo(time, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut),
            //     {
            //         Size:
            //             new Vector3(
            //                 this.eyes.Size.X,
            //                 this.eyes.Size.Y * .65,
            //                 this.eyes.Size.Z
            //             )
            //     });
            // tween.Play();
        }

        // blink
        const openEye = newBlinkTrack.GetMarkerReachedSignal("OpenEye").Connect(() => {
            this.openLeftEye();
            this.openRightEye();
            if (this.eyes) {
                this.eyes.Size = new Vector3(
                    this.eyes.Size.X,
                    1,
                    this.eyes.Size.Z
                )
            }
        })
        const closeEye = newBlinkTrack.GetMarkerReachedSignal("CloseEye").Connect(() => {
            this.closeLeftEye();
            this.closeRightEye();
        })
        const close = newBlinkTrack.Stopped.Connect(() => {
            openEye.Disconnect();
            closeEye.Disconnect();
            close.Disconnect();
        })
    }
}