import EntityGraphics from ".";

export default class Expression {
    static readonly expressions: Record<string, string> = {
        'entity_adalbrecht_eye_left_neutral': 'rbxassetid://83323658516421',
        'entity_adalbrecht_eye_right_neutral': 'rbxassetid://86539013473127',
        'entity_adalbrecht_eye_left_blink': 'rbxassetid://94175562997842',
        'entity_adalbrecht_eye_right_blink': 'rbxassetid://81850963919333',
    }

    model: Model;
    eyes?: Part;
    leftEyeDecal?: Decal;
    rightEyeDecal?: Decal;
    closedLeftEyeTextID?: string;
    closedRightEyeTextID?: string;

    constructor(entity: EntityGraphics) {
        this.model = entity.model;

        const head = this.model.FindFirstChild("Head"); assert(head, "[Expression] Head not found in model.");
        const eyes = head.FindFirstChild("eyes") as Part | undefined;
        this.eyes = eyes;
        if (eyes) {
            this.leftEyeDecal = this.getDecal(eyes, "eye_left");
            this.rightEyeDecal = this.getDecal(eyes, "eye_right");
        } else {
            this.leftEyeDecal = this.getDecal(head, "eye_left");
            this.rightEyeDecal = this.getDecal(head, "eye_right");
        }
    }

    private getDecal(parent: Instance, name: string): Decal | undefined {
        const decal = parent.FindFirstChild(name);
        if (decal && decal.IsA("Decal")) {
            return decal as Decal;
        }
    }

    private setEyeTexture(decal: Decal | undefined, textureID: string | undefined) {
        if (decal && textureID) {
            decal.Texture = textureID;
        }
    }

    closeLeftEye() {
        this.closedLeftEyeTextID = this.closedLeftEyeTextID ?? Expression.expressions[`${this.model?.Name}_eye_left_blink`];
        this.setEyeTexture(this.leftEyeDecal, this.closedLeftEyeTextID);
    }

    closeRightEye() {
        this.closedRightEyeTextID = this.closedRightEyeTextID ?? Expression.expressions[`${this.model?.Name}_eye_right_blink`];
        this.setEyeTexture(this.rightEyeDecal, this.closedRightEyeTextID);
    }

    openLeftEye() {
        this.setEyeTexture(this.leftEyeDecal, Expression.expressions[`${this.model?.Name}_eye_left_neutral`]);
    }

    openRightEye() {
        this.setEyeTexture(this.rightEyeDecal, Expression.expressions[`${this.model?.Name}_eye_right_neutral`]);
    }

    blink(newBlinkTrack: AnimationTrack) {
        const openEye = newBlinkTrack.GetMarkerReachedSignal("OpenEye").Connect(() => {
            this.openLeftEye();
            this.openRightEye();
            if (this.eyes) {
                this.eyes.Size = new Vector3(this.eyes.Size.X, 1, this.eyes.Size.Z);
            }
        });

        const closeEye = newBlinkTrack.GetMarkerReachedSignal("CloseEye").Connect(() => {
            this.closeLeftEye();
            this.closeRightEye();
        });

        const close = newBlinkTrack.Stopped.Connect(() => {
            openEye.Disconnect();
            closeEye.Disconnect();
            close.Disconnect();
        });
    }
}
