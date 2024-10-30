import React, { ReactComponent } from "@rbxts/react";
import { TweenService } from "@rbxts/services";

interface ButtonElementProps {
    text: string;
    size: number;
    position: number;
    transparency?: number;
    onclick: () => void;
}
interface ButtonElementState { }

@ReactComponent
export default class ButtonElement extends React.Component<ButtonElementProps, ButtonElementState> {
    private buttonRef: React.RefObject<TextButton>;

    constructor(props: ButtonElementProps) {
        super(props);
        this.buttonRef = React.createRef<TextButton>();
    }

    private tweenColor(targetColor: Color3) {
        const button = this.buttonRef.current;
        if (button) {
            const tweenInfo = new TweenInfo(0.25, Enum.EasingStyle.Quad, Enum.EasingDirection.Out);
            const tween = TweenService.Create(button, tweenInfo, { BackgroundColor3: targetColor });
            tween.Play();
        }
    }

    render() {
        return (
            <textbutton
                ref={this.buttonRef}
                Text={this.props.text}
                Position={new UDim2(0, 0, this.props.position, 0)}
                Size={new UDim2(1, 0, this.props.size, 0)}
                BackgroundTransparency={this.props.transparency || 0}
                TextScaled={true}
                TextColor3={new Color3(0, 0, 0)}
                BackgroundColor3={new Color3(1, 1, 1)}
                Event={{
                    MouseButton1Click: this.props.onclick,
                    MouseEnter: () => {
                        // Tween to a darker color on mouse enter
                        this.tweenColor(new Color3(0.7, 0.7, 0.7));
                    },
                    MouseLeave: () => {
                        // Tween back to white on mouse leave
                        this.tweenColor(new Color3(1, 1, 1));
                    }
                }}
            />
        );
    }
}
