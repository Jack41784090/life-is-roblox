import { useMotion } from '@rbxts/pretty-react-hooks';
import * as React from 'react';
import { CONDOR_BLOOD_RED } from 'shared/const';
import { springs } from 'shared/utils';

export interface Props {
    text: string;
    onClick: () => void;
}

export function MainMenuButton({ text, onClick }: Props) {
    const [pressed, setPressed] = React.useState(false);
    const [hovered, setHovered] = React.useState(false);
    const [buttonPosition, buttonPositionMotion] = useMotion(0);

    React.useEffect(() => {
        if (pressed) {
            buttonPositionMotion.spring(.65, springs.responsive);
        } else if (hovered) {
            buttonPositionMotion.spring(.5, springs.slow);
        } else {
            buttonPositionMotion.spring(0, springs.responsive)
        }
    }, [pressed, hovered]);

    return (
        <textbutton
            Text={text}
            TextScaled={true}
            Font={Enum.Font.Antique}
            TextColor3={Color3.fromRGB(255, 255, 255)}
            Size={UDim2.fromScale(0.75, 0.25)}
            TextWrap={true}
            BackgroundTransparency={1}
            TextXAlignment={Enum.TextXAlignment.Left}
            Event={{
                Activated: onClick,
                MouseEnter: () => setHovered(true),
                MouseLeave: () => {
                    setHovered(false);
                    setPressed(false);
                },
                MouseButton1Down: () => setPressed(true),
                MouseButton1Up: () => setPressed(false),
            }}
        >
            <uistroke Color={CONDOR_BLOOD_RED} Thickness={3} />
            <frame
                AnchorPoint={new Vector2(0, 1)}
                Size={buttonPosition.map(v => UDim2.fromScale(text.size() / 15 * v, 0.05))}
                BackgroundTransparency={0}
                Position={UDim2.fromScale(0, 1)}
                BackgroundColor3={CONDOR_BLOOD_RED}>
                <uistroke Thickness={0} />
            </frame>
        </textbutton>
    );
}

export default MainMenuButton;