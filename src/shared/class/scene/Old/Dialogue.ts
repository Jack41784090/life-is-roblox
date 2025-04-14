import { Players } from "@rbxts/services";
import { uiFolder } from "shared/const/assets";
import { DialogueAlignment, DialogueBoxConfig } from "./types";

const DIALOGUE_TEXT_PROPERTY_NAME = 'DialogueText';

export default class DialogueBox {
    enabled: boolean = false;
    textV: StringValue = new Instance('StringValue');

    screenGUI: ScreenGui;
    speechLabel: TextLabel;
    authorNameLabel: TextLabel;
    backgroundFrame: Frame;
    authorFrame: Frame;
    gradientFrame: Frame;
    textBoxFrame: Frame;
    uiGradient: UIGradient;

    updateTextScript: RBXScriptConnection;

    constructor(config: DialogueBoxConfig) {
        this.screenGUI = uiFolder.WaitForChild('DialogueScreenGUI').Clone() as ScreenGui;
        this.updateTextScript = this.textV.GetPropertyChangedSignal('Value').Connect(() => {
            if (this.speechLabel) this.speechLabel.Text = this.textV.Value;
        })
        this.configureDialogueBox();

        this.backgroundFrame = this.screenGUI.WaitForChild('BackgroundFrame') as Frame;
        this.backgroundFrame.Visible = config.hasCover ?? false;

        this.gradientFrame = this.screenGUI.WaitForChild('GradientFrame') as Frame;
        this.textBoxFrame = this.gradientFrame.WaitForChild('TextBoxFrame') as Frame;
        this.speechLabel = this.textBoxFrame.WaitForChild(DIALOGUE_TEXT_PROPERTY_NAME) as TextLabel;
        this.authorFrame = this.gradientFrame.WaitForChild('authorFrame') as Frame;
        this.authorNameLabel = this.authorFrame.WaitForChild("AuthorName") as TextLabel;
        this.authorNameLabel.Transparency = 1;
        this.uiGradient = this.gradientFrame.FindFirstChildOfClass('UIGradient') as UIGradient;

        this.textV.Value = config.initialText ?? '';
    }

    private configureDialogueBox() {
        this.screenGUI.Enabled = this.enabled;
        this.screenGUI.Destroying.Once(() => {
            this.textV.Destroy();
            this.updateTextScript.Disconnect();
        })
        this.screenGUI.Parent = Players.LocalPlayer.WaitForChild('PlayerGui');
    }

    public align(alignment: DialogueAlignment) {
        print(`alignment: ${alignment}`);
        switch (alignment) {
            case "top": {
                this.gradientFrame.AnchorPoint = new Vector2(0, 0);
                this.gradientFrame.Position = UDim2.fromScale(0, 0);
                this.uiGradient.Rotation = -90;
                this.authorFrame.Position = UDim2.fromScale(0, 1);
                break;
            }
            case "center": {
                this.gradientFrame.AnchorPoint = new Vector2(0, .5);
                this.gradientFrame.Position = UDim2.fromScale(0, .5);
                this.gradientFrame.BackgroundTransparency = 1;
                this.authorFrame.Position = UDim2.fromScale(0, -.25)
                break;
            }
            case "bottom": {
                this.gradientFrame.AnchorPoint = new Vector2(0, 1);
                this.gradientFrame.Position = UDim2.fromScale(0, 1);
                this.uiGradient.Rotation = 90;
                this.authorFrame.Position = UDim2.fromScale(0, -.25)
                break;
            }
        }
    }

    public speak(text: string, author?: string) {
        const characterArray = text.split('');
        this.authorNameLabel.Text = author ?? '';
        this.authorFrame.Transparency = this.authorNameLabel.Text === '' ? 1 : 0;
        this.authorNameLabel.TextTransparency = this.authorNameLabel.Text === '' ? 1 : 0;
        this.textV.Value = '';
        return new Promise<void>((resolve) => {
            characterArray.forEach((char) => {
                wait(.05);
                this.textV.Value += char;
            })
            wait(1);
            resolve();
        })
    }

    public setText(newText: string) {
        this.textV.Value = newText;
    }

    public hide() {
        return this.enable(false);
    }

    public enable(b: boolean = true) {
        this.screenGUI.Enabled = b;
        return this.screenGUI;
    }
}
