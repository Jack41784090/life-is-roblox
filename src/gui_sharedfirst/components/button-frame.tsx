import React, { ReactComponent } from "@rbxts/react";

interface ButtonFrameElementProps {
    position?: UDim2;
    size?: UDim2;
}
interface ButtonFrameElementState { }
@ReactComponent
export default class ButtonFrameElement extends React.Component<ButtonFrameElementProps, ButtonFrameElementState> {
    constructor(props: ButtonFrameElementProps) {
        super(props);
    }

    render() {
        return (
            <frame
                key={"ButtonFrame"}
                Position={this.props.position ?? new UDim2(0.3, 0, 0.35, 0)}
                Size={this.props.size ?? new UDim2(0.4, 0, 0.6, 0)}
                BackgroundTransparency={0.25}
                BackgroundColor3={new Color3(1, 1, 1)}
                BorderColor3={new Color3(0, 0, 0)}
                BorderSizePixel={2}
            >
                {this.props.children}
            </frame>
        );
    }
}
