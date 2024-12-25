import { useMotion } from '@rbxts/pretty-react-hooks';
import { RedSpring } from 'gui_sharedfirst/new_components/redSpring';
import * as React from 'react';
import { springs } from 'shared/utils';

interface Props {
    mouseClicked: () => void;
}

export function WaitingRoomReadyButton(props: Props) {
    const [hovered, setHovered] = React.useState(false);
    const [charge, chargeMotion] = useMotion(0);

    React.useEffect(() => {
        if (hovered) {
            chargeMotion.spring(1, springs.slow);
        } else {
            chargeMotion.spring(0, springs.responsive)
        }
    }, [hovered]);

    return (
        <textbutton
            Position={UDim2.fromScale(0.75, 0.9)}
            Text={'Ready'}
            TextScaled={true}
            Font={Enum.Font.Antique}
            TextColor3={Color3.fromRGB(255, 255, 255)}
            Size={UDim2.fromScale(0.25, 1 / 10)}
            TextWrap={true}
            BackgroundTransparency={0}
            TextXAlignment={Enum.TextXAlignment.Center}
            Event={{
                MouseEnter: () => setHovered(true),
                MouseLeave: () => {
                    setHovered(false);
                },
                MouseButton1Click: () => {
                    props.mouseClicked();
                }
            }}
        >
            <RedSpring charge={charge} />
        </textbutton>
    );
}

export default WaitingRoomReadyButton;