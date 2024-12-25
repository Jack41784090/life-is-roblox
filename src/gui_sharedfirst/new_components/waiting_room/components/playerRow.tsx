import { useMotion } from '@rbxts/pretty-react-hooks';
import * as React from 'react';
import { CONDOR_BLOOD_RED } from 'shared/const';
import { springs } from 'shared/utils';

export interface Props {
    text: string;
}

export function WaitingRoomPlayerRow({ text }: Props) {
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
        <textlabel
            Text={text}
            TextScaled={true}
            Font={Enum.Font.Antique}
            TextColor3={Color3.fromRGB(255, 255, 255)}
            Size={UDim2.fromScale(0.75, 1 / 10)}
            TextWrap={true}
            BackgroundTransparency={0}
            TextXAlignment={Enum.TextXAlignment.Left}
            Event={{
                MouseEnter: () => setHovered(true),
                MouseLeave: () => {
                    setHovered(false);
                },
            }}
        >
            <uistroke Color={CONDOR_BLOOD_RED} Thickness={3} />
            <frame
                AnchorPoint={new Vector2(0, 1)}
                Size={charge.map(v => UDim2.fromScale(v, 0.05))}
                BackgroundTransparency={0}
                Position={UDim2.fromScale(0, 1)}
                BackgroundColor3={CONDOR_BLOOD_RED}>
                <uistroke Thickness={0} />
            </frame>
        </textlabel>
    );
}

export default WaitingRoomPlayerRow;