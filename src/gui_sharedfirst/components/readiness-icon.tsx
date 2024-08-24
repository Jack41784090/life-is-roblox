import Roact from "@rbxts/roact";
import { ReadinessIcon } from "shared/types/battle-types";

interface ReadinessIconElementProps {
    icon: ReadinessIcon;
    index: number;
}
interface ReadinessIconElementState {
    icon: ReadinessIcon;
    index: number;
    iconRef: Roact.Ref<Frame>;
    textLabelRef: Roact.Ref<TextLabel>;
}

export class ReadinessIconElement extends Roact.Component<ReadinessIconElementProps, ReadinessIconElementState> {
    constructor(props: ReadinessIconElementProps) {
        super(props);
        print(props)
        this.state = {
            icon: props.icon,
            index: props.index,
            iconRef: Roact.createRef<Frame>(),
            textLabelRef: Roact.createRef<TextLabel>(),
        };
    }

    render() {
        print(`${this.props.icon.iconID} render: ${this.state.icon.readiness}`);
        return (
            <frame
                Size={new UDim2(1, 50, 1, 50)}
                Position={UDim2.fromScale(0, this.state.icon.readiness)}
                SizeConstraint={Enum.SizeConstraint.RelativeXX}
                BackgroundTransparency={1}
                Ref={this.state.iconRef}
            >
                <imagelabel
                    AnchorPoint={new Vector2(0.5, 0.5)}
                    Size={UDim2.fromScale(1, 1)}
                    Image={this.state.icon.iconUrl}
                />
                <textlabel
                    AnchorPoint={new Vector2(0, 0.5)}
                    Key={`Label${this.state.index}`}
                    Size={UDim2.fromScale(1, 1)}
                    Text={string.format("%.2f", this.state.icon.readiness)}
                    TextScaled={true}
                    BackgroundTransparency={1}
                    TextColor3={new Color3(1, 1, 1)}
                    Ref={this.state.textLabelRef}
                />
            </frame>
        );
    }
}

export default ReadinessIconElement;
