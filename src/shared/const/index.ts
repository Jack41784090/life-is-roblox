
export const HOUR = 1000 * 60 * 60;
export const NORM_CHAR_LIMIT = 2000;
export const DESCRIPTION_LIMIT = 4096;
export const FIELD_NAME_LIMIT = 256;
export const FIELD_VALUE_LIMIT = 1024;

export const NOAH_USERID = '843757875477741569';
export const MERC_USERID = '262871357455466496';
export const IKE_USERID = '634873409393917952';
export const NOAH_DMID = '1232116541890363403';
export const LAB_CHANNELID = '1232126725039587389'
export const NEWESTIA_NEWFORUMID = '1238766847558549634';

export const USERINFO_COLLECTION_NAME = 'User';
export const GUILDINFO_COLLECTION_NAME = 'Guild';
export const COMBATCHARACTER_COLLECTION_NAME = 'Combat Character'
export const DEFAULT_WELCOME_MESSAGE = 'Welcome to the server, @user!';
export const DEFAULT_LEAVE_MESSAGE = 'Goodbye, @user!';

export const BUSS_SERVERID = '1237927573489582190';
export const COLNDIR_SERVERID = '981009510934151188';
export const ALTPAKT_SERVERID = '1206814142938357780';

export const LOGCO_ORG = 11.1;
export const XCO_ORG = 0.23;
export const LOGCO_STR_HP = 8.3;
export const XCO_STR_HP = 0.6;
export const LOGCO_SIZ_HP = 12;
export const XCO_SIZ_HP = 0.7;

export const pierceFailFallCoef = 0.057
export const forceFailFallCoef = 0.007

export const FORESEE = 4;

export const INTERFACE_PERSIST_TIME = 15
export const INTERFACE_REFRESH_TIME = 5

export enum Emoji {
    BOOM = '💥',
    STATUS = '📊',
    TARGET = '🎯',
    SHIELD = '🛡️',
    SWORD = '⚔️',
    HEART = '❤️',
    MORALE = '🔵',
    STAMINA = '🟢',
    POSTURE = '🟡',
    CLOCK = '⏰',
    BOMB = '💣',
    FIRE = '🔥',
    ICE = '❄️',
    WIND = '🌀',
    EARTH = '🌍',
    RED_SIGN = '🚫',
    THINKING = '🤔',
    DOUBLE_EXCLAMATION = '‼️',
    SPARKLES = '✨',
}

export enum iEntityKeyEmoji {
    stamina = Emoji.STAMINA,
    hp = Emoji.HEART,
    org = Emoji.MORALE,
    pos = Emoji.POSTURE,
}

export const MOVEMENT_COST = 10;
export const MAX_READINESS = 100;

export const DECAL_WITHINRANGE = 'rbxassetid://89793300852596';
export const DECAL_OUTOFRANGE = 'rbxassetid://114570670961562';

export const HEXAGON_MAGIC = 0.395;

export const HEXAGON_HEIGHT = 0.425

export const CONDOR_BLOOD_RED = Color3.fromRGB(140, 0, 0);

export enum GuiTag {
    MainGui = 'BattleMainGui',
    ActionMenu = 'BattleActionMenu',
    Glow = 'BattleGlow',
    OtherTurn = 'BattleTarget',
    AbilitySlot = 'BattleAbilitySlot',
    WaitingRoom = 'BattleWaitingRoom',
    SpeechBubblesContainer = 'SpeechBubble',
    FightingStyleSelector = 'BattleFightingStyleSelector',
}


export const SELECTED_COLOUR = new Color3(1, 58 / 255, 58 / 255);
export const TWEEN_TIME = 0.5;

export enum PlaceName {
    City = 'City',
    Konigsberg = 'Konigsberg',
}
