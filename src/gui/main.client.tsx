import Roact from "@rbxts/roact";
import ButtonFrameElement from "./component/button-frame";
import MenuFrameElement from "./component/menu";
import TitleElement from "./component/title";

Roact.mount((
    <MenuFrameElement>
        <TitleElement text="Epic Colndir Game!!!" />
        <ButtonFrameElement />
    </MenuFrameElement>
));
