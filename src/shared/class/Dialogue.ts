import { Players } from "@rbxts/services";

const DIALOGUE_TEXT_PROPERTY_NAME = 'DialogueText';

export default class DialogueBox {
    enabled: boolean = false;
    screenGUI: ScreenGui;
    textV: StringValue = new Instance('StringValue');
    textLabel: TextLabel;
    authorFrame: Frame;
    authorNameLabel: TextLabel;

    private static Create() {
        const screenGUI = new Instance('ScreenGui');
        screenGUI.Name = 'DialogueScreenGUI';

        const gradientGUIFrame = new Instance('Frame');
        gradientGUIFrame.Name = 'GradientFrame';
        gradientGUIFrame.AnchorPoint = new Vector2(0, 1);
        gradientGUIFrame.Position = UDim2.fromScale(0, 1);
        gradientGUIFrame.Size = UDim2.fromScale(1, 0.3);
        gradientGUIFrame.Parent = screenGUI;

        const gradientGUI = new Instance('UIGradient');
        gradientGUI.Color = new ColorSequence(new Color3(255, 255, 255), new Color3(0, 0, 0));
        gradientGUI.Rotation = 90;
        gradientGUI.Transparency = new NumberSequence(1, .525);
        gradientGUI.Parent = gradientGUIFrame;

        const authorFrame = new Instance('Frame')
        authorFrame.Name = 'authorFrame';
        authorFrame.AnchorPoint = new Vector2(0, 0);
        authorFrame.BackgroundColor3 = new Color3(0, 0, 0);
        authorFrame.BackgroundTransparency = .9
        authorFrame.Position = UDim2.fromScale(0, -.25);
        authorFrame.Size = UDim2.fromScale(.3, .25);
        authorFrame.Parent = gradientGUIFrame;

        const authorNameLabel = new Instance('TextLabel');
        authorNameLabel.Name = "AuthorName";
        authorNameLabel.Size = UDim2.fromScale(1, 1);
        authorNameLabel.Font = Enum.Font.Highway;
        authorNameLabel.Text = '';
        authorNameLabel.TextSize = 21;
        authorNameLabel.TextStrokeColor3 = new Color3(255, 255, 255);
        authorNameLabel.TextStrokeTransparency = .25;
        authorNameLabel.TextTransparency = 0;
        authorNameLabel.TextWrapped = true;
        authorNameLabel.BackgroundTransparency = 1;
        authorNameLabel.TextYAlignment = Enum.TextYAlignment.Center;
        authorNameLabel.Parent = authorFrame

        const textboxFrame = new Instance('Frame');
        textboxFrame.Name = 'TextBoxFrame';
        textboxFrame.AnchorPoint = new Vector2(0.5, 0);
        textboxFrame.BackgroundColor3 = new Color3(0, 0, 0);
        textboxFrame.BackgroundTransparency = .9
        textboxFrame.Position = UDim2.fromScale(.5, 0);
        textboxFrame.Size = UDim2.fromScale(.8, 1);
        textboxFrame.Parent = gradientGUIFrame;

        const paddingUI = new Instance('UIPadding');
        paddingUI.PaddingTop = new UDim(.05, 0);
        paddingUI.PaddingLeft = new UDim(.05, 0);
        paddingUI.PaddingRight = new UDim(.05, 0);
        paddingUI.Parent = textboxFrame;

        const textLabel = new Instance('TextLabel');
        textLabel.Name = DIALOGUE_TEXT_PROPERTY_NAME;
        textLabel.Size = UDim2.fromScale(1, 1);
        textLabel.Font = Enum.Font.Highway;
        textLabel.Text = '';
        textLabel.TextSize = 42;
        textLabel.TextStrokeColor3 = new Color3(255, 255, 255);
        textLabel.TextStrokeTransparency = .25;
        textLabel.TextWrapped = true;
        textLabel.BackgroundTransparency = 1;
        textLabel.TextYAlignment = Enum.TextYAlignment.Top;
        textLabel.Parent = textboxFrame

        return screenGUI;
    }

    constructor(_text: string) {
        this.screenGUI = DialogueBox.Create();
        this.screenGUI.Enabled = this.enabled;
        this.screenGUI.Destroying.Once(() => {
            this.textV.Destroy();
            textVS.Disconnect();
        })
        this.screenGUI.Parent = Players.LocalPlayer.WaitForChild('PlayerGui');

        this.textLabel = this.screenGUI.WaitForChild('GradientFrame').WaitForChild('TextBoxFrame').WaitForChild(DIALOGUE_TEXT_PROPERTY_NAME) as TextLabel;
        this.authorFrame = this.screenGUI.WaitForChild('GradientFrame').WaitForChild('authorFrame') as Frame;
        this.authorNameLabel = this.authorFrame.WaitForChild("AuthorName") as TextLabel;
        this.authorNameLabel.Transparency = 1;

        this.textV.Value = _text;
        const textVS = this.textV.GetPropertyChangedSignal('Value').Connect(() => {
            if (this.textLabel) this.textLabel.Text = this.textV.Value;
        })

    }

    speak(text: string, author?: string) {
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

    setText(newText: string) {
        this.textV.Value = newText;
    }

    hide() {
        return this.enable(false);
    }
    enable(b: boolean = true) {
        this.screenGUI.Enabled = b;
        return this.screenGUI;
    }
}
