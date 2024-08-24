import Roact from "@rbxts/roact";
import { ReadinessIcon } from "shared/types/battle-types";

interface ReadinessIconElementProps {
    icon: ReadinessIcon;
    index: number;
    iconRef: Roact.Ref<Frame>;
}
interface ReadinessIconElementState { }

export class ReadinessIconElement extends Roact.Component<ReadinessIconElementProps, ReadinessIconElementState> {
    ilrPosChanged: RBXScriptConnection | undefined;
    textLabelRef: Roact.Ref<TextLabel> | undefined;

    constructor(props: ReadinessIconElementProps) {
        super(props);
        this.textLabelRef = Roact.createRef<TextLabel>();
    }

    protected didMount(): void {
        const ilr = this.props.iconRef.getValue();
        const tlr = this.textLabelRef?.getValue();
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
                Ref={this.props.iconRef}
            >
                <imagelabel
                    AnchorPoint={new Vector2(0.5, 0.5)}
                    Size={UDim2.fromScale(1, 1)}
                    Image={this.props.icon.iconUrl}
                />
                <textlabel
                    AnchorPoint={new Vector2(0, 0.5)}
                    Key={`Label${this.props.index}`}
                    Size={UDim2.fromScale(1, 1)}
                    Text={string.format("%.2f", this.props.icon.readiness)}
                    TextScaled={true}
                    BackgroundTransparency={1}
                    TextColor3={new Color3(1, 1, 1)}
                    Ref={this.textLabelRef}
                />
            </frame>
        );
    }
}

export default ReadinessIconElement;
