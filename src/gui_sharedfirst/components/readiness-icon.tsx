import React, { ReactComponent } from "@rbxts/react";
import { ReadinessIcon } from "shared/types/battle-types";

interface ReadinessIconElementProps {
    icon: ReadinessIcon;
    index: number;
    iconRef: React.RefObject<Frame>;
}
interface ReadinessIconElementState { }

@ReactComponent
export class ReadinessIconElement extends React.Component<ReadinessIconElementProps, ReadinessIconElementState> {
    ilrPosChanged: RBXScriptConnection | undefined;
    textLabelRef: React.RefObject<TextLabel> | undefined;

    constructor(props: ReadinessIconElementProps) {
        super(props);
        this.textLabelRef = React.createRef<TextLabel>();
    }

    protected didMount(): void {
        const ilr = this.props.iconRef.current;
        const tlr = this.textLabelRef?.current;
        this.ilrPosChanged = ilr?.GetPropertyChangedSignal('Position').Connect(() => {
            const readiness = ilr.Position.Y.Scale;
            if (tlr?.Text) tlr.Text = string.format("%.2f", readiness);
        });
    }

    protected willUnmount(): void {
        this.ilrPosChanged?.Disconnect();
    }

    render() {
        return (
            <frame
                Size={new UDim2(1, 50, 1, 50)}
                Position={UDim2.fromScale(0, this.props.icon.readiness)}
                SizeConstraint={Enum.SizeConstraint.RelativeXX}
                BackgroundTransparency={1}
                ref={this.props.iconRef}
            >
                <imagelabel
                    AnchorPoint={new Vector2(0.5, 0.5)}
                    Size={UDim2.fromScale(1, 1)}
                    Image={this.props.icon.iconUrl}
                />
                <textlabel
                    AnchorPoint={new Vector2(0, 0.5)}
                    key={`Label${this.props.index}`}
                    Size={UDim2.fromScale(1, 1)}
                    Text={string.format("%.2f", this.props.icon.readiness)}
                    TextScaled={true}
                    BackgroundTransparency={1}
                    TextColor3={new Color3(1, 1, 1)}
                    ref={this.textLabelRef}
                />
            </frame>
        );
    }
}

export default ReadinessIconElement;
