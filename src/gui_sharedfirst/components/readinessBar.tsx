import Roact from "@rbxts/roact";
import { ReadinessIcon } from "shared/types/battle-types";
import ReadinessIconElement from "./readiness-icon";

interface ReadinessBarElementProps {
    icons: ReadinessIcon[]; // Array of image URLs or asset IDs for character icons
    ref: Map<number, Roact.Ref<Frame>>;
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
            const iconRef = this.props.ref.get(icon.iconID);
            const position = UDim2.fromScale(0, icon.readiness);
            // const element = (
            //     <frame
            //         Key={index}
            //         Size={new UDim2(1, 50, 1, 50)}
            //         Position={position}
            //         SizeConstraint={Enum.SizeConstraint.RelativeXX}
            //         BackgroundTransparency={1}
            //         Ref={iconRef}
            //     >
            //         <imagelabel
            //             AnchorPoint={new Vector2(0.5, 0.5)}
            //             Size={UDim2.fromScale(1, 1)}
            //             Image={icon.iconUrl}
            //         />
            //         <textlabel
            //             AnchorPoint={new Vector2(0, 0.5)}
            //             Key={`Label${index}`}
            //             Size={UDim2.fromScale(1, 1)}
            //             Text={string.format("%.2f", icon.readiness)}
            //             TextScaled={true}
            //             BackgroundTransparency={1}
            //             TextColor3={new Color3(1, 1, 1)}
            //         />
            //     </frame>
            // );

            return <ReadinessIconElement icon={icon} index={index} />;
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
