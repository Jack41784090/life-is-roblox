import Roact from "@rbxts/roact";
import { ReadinessIcon } from "shared/types/battle-types";

interface ReadinessBarElementProps {
    icons: ReadinessIcon[]; // Array of image URLs or asset IDs for character icons
    ref: Roact.Ref<ImageLabel>[];
}
interface ReadinessBarElementState { }

export class ReadinessBarElement extends Roact.Component<ReadinessBarElementProps, ReadinessBarElementState> {
    constructor(props: ReadinessBarElementProps) {
        super(props);
    }

    createIconElements(): Roact.Element[] {
        return this.props.icons.map((icon, index) => {
            // Calculate the position based on readiness
            print(`Icon Readiness: ${icon.readiness} ${icon.iconUrl}`);
            const iconRef = this.props.ref[index];
            const position = UDim2.fromScale(0, icon.readiness);

            return (
                <imagelabel
                    Key={index}
                    AnchorPoint={new Vector2(0.5, 0.5)}
                    Size={new UDim2(1, 50, 1, 50)}
                    Position={position}
                    Image={icon.iconUrl}
                    SizeConstraint={Enum.SizeConstraint.RelativeXX}
                    BackgroundTransparency={1}
                    Ref={iconRef}
                />
            );
        });
    }

    render() {
        const iconElements = this.createIconElements();

        return (
            <frame
                Key={"ReadinessBar"}
                Position={new UDim2(0.05, 0, 0.1, 0)}
                Size={new UDim2(0.005, 0, 0.8, 0)}
                BackgroundTransparency={0.25}
                BackgroundColor3={new Color3(1, 0.03, 0.03)}
                BorderColor3={new Color3(0, 0, 0)}
                BorderSizePixel={2}
            >
                {iconElements}
            </frame>
        );
    }
}

export default ReadinessBarElement;
