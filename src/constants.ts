import { Card, UnoGameSettings } from "./types.js";

// start of clyde constants

/*
@Clyde We are going to play Uno, and you are one of the participants. When it is your turn to play, you will receive a message that gives you the type and colour of the current card, being the colour first and the type second, like "red 0", The current card is separated from your cards by a full stop. The current card is not part of your cards. After the current card you have your cards, and you will receive a list of all the cards in your hand, separated by a comma, for example "green 2, red 7, red 9, red block, +4, red 4, red 3". Only from the list of cards given, you can pick any card which matches either the colour or the type of the current card. The type of the card can be a number, "+2", "reverse" or "block". The only exception to this rule is when playing a wild card or +4 card, and all other cards must match either the colour or the type of the current card. If the card you played requires picking a colour, you will respond with the type of the card followed by the preferred colour, for example "wild blue". Your pick must follow Uno rules, and have either the same colour or the same type as the current card. A type is can be a number, "+2", "reverse" or "block". This rule applies to all cards that are not wild cards or +4 cards. If none of the cards in your hand can be played, you will respond with "draw". If the card you picked is unable to be played, you will be told so with "that does not match the colour or the type of the current card". In that case, you have to look back at your current cards, and pick any card from your cards that matches the colour or the type of the current card provided in the last message, unless you have a wild card or +4 card, in which case you will respond with that card and the colour you want to change the game to.
Your first input is "fill me"

"that does not match the colour or the type of the current card" if it gets it wrong
*/

export const clyde = "1081004946872352958";

// end of clyde constants

export const devs = ["406028027768733696"];

export const colors = ["red", "yellow", "green", "blue",] as const;
export const variants = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+2", "reverse", "block",] as const;
export const uniqueVariants = ["wild", "+4",] as const;
export const cards = (colors
    .map(c => variants.map(v => `${c}-${v}`))
    .flat() as Card[])
    .concat(uniqueVariants);
export const cardEmotes: { [k in Card]: string } = {
    "red-0": "<:R0:1079758914909900890>",
    "red-1": "<:R1:1079758916491149332>",
    "red-2": "<:R2:1079758919066468423>",
    "red-3": "<:R3:1079758920899362838>",
    "red-4": "<:R4:1079758924661665802>",
    "red-5": "<:R5:1079758926163222629>",
    "red-6": "<:R6:1079758928608505876>",
    "red-7": "<:R7:1079758930168791060>",
    "red-8": "<:R8:1079758932702146621>",
    "red-9": "<:R9:1079758934103040121>",
    "red-+2": "<:Rd2:1079758935621382224>",
    "red-reverse": "<:Rr:1079758938247020554>",
    "red-block": "<:Rb:1083071833156358155>",
    "yellow-0": "<:Y0:1079758940818133053>",
    "yellow-1": "<:Y1:1079758943963852801>",
    "yellow-2": "<:Y2:1079759135815503982>",
    "yellow-3": "<:Y3:1079758947680010341>",
    "yellow-4": "<:Y4:1079758951341633606>",
    "yellow-5": "<:Y5:1079759137489039491>",
    "yellow-6": "<:Y6:1079758954160201808>",
    "yellow-7": "<:Y7:1079759140395700274>",
    "yellow-8": "<:Y8:1079758957649858590>",
    "yellow-9": "<:Y9:1079775514786533376>",
    "yellow-+2": "<:Yd2:1079758965065388182>",
    "yellow-reverse": "<:Yr:1079758967489708062>",
    "yellow-block": "<:Yb:1083071816110702623>",
    "blue-0": "<:B0:1079758719820255262>",
    "blue-1": "<:B1:1079758722060013579>",
    "blue-2": "<:B2:1079758725977485473>",
    "blue-3": "<:B3:1079758728754106379>",
    "blue-4": "<:B4:1079758731224567841>",
    "blue-5": "<:B5:1079758732998750238>",
    "blue-6": "<:B6:1079758735561474148>",
    "blue-7": "<:B7:1079758737033674872>",
    "blue-8": "<:B8:1079758785557577838>",
    "blue-9": "<:B9:1079758788460023888>",
    "blue-+2": "<:Bd2:1079758789999345715>",
    "blue-reverse": "<:Br:1079758792658518096>",
    "blue-block": "<:Bb:1083071719222296788>",
    "green-0": "<:G0:1079758849369706547>",
    "green-1": "<:G1:1079758851643019336>",
    "green-2": "<:G2:1079758854662930473>",
    "green-3": "<:G3:1079758856311287878>",
    "green-4": "<:G4:1079758858723004426>",
    "green-5": "<:G5:1079758860983750786>",
    "green-6": "<:G6:1079758863252852766>",
    "green-7": "<:G7:1079758864787963944>",
    "green-8": "<:G8:1079758866784456735>",
    "green-9": "<:G9:1079758868734812165>",
    "green-+2": "<:Gd2:1079758869762408480>",
    "green-reverse": "<:Gr:1079758912045195344>",
    "green-block": "<:Gb:1083071799945859104>",
    "wild": "<:Wn:1083073225371693056>",
    "+4": "<:d4:1083073222230155295>",
};
export const coloredUniqueCards: { [k in `${typeof colors[number]}-${typeof uniqueVariants[number]}`] } = {
    "red-wild": "<:Wr:1083073403197587476>",
    "red-+4": "<:4r:1083073363360108545>",
    "yellow-wild": "<:Wy:1083073405793873940>",
    "yellow-+4": "<:4y:1083073365641801849>",
    "green-wild": "<:Wg:1083073401469542460>",
    "green-+4": "<:4g:1083073361875325071>",
    "blue-wild": "<:Wb:1083073398374137917>",
    "blue-+4": "<:4b:1083073359404867716>"
};

// yes i like catppuccin how could you tell
export const rainbowColors = [
    0xf38ba8,
    0xfab387,
    0xf9e2af,
    0xa6e3a1,
    0x74e7bc,
    0xf5c2e7
] as const;
export const defaultColor = 0x6c7086;

export const defaultSettings: UnoGameSettings = {
    timeoutDuration: 150,
    kickOnTimeout: true,
    allowSkipping: true,
    antiSabotage: true,
    allowStacking: true
} as const;

// its "just" 25 days but i still doubt a game will go on for longer than that
export const veryLongTime = 2_147_483.647;

export const ButtonIDs = Object.freeze({
    JOIN_GAME: "join",
    LEAVE_GAME_BEFORE_START: "leave",
    EDIT_GAME_SETTINGS: "game-settings",
    DELETE_GAME: "delete-game",
    START_GAME: "start",
    VIEW_CARDS: "view-cards",
    PLAY_CARD: "play-game",
    LEAVE_GAME: "leave-game",
    LEAVE_GAME_CONFIRMATION_YES: "confirm-leave-game",
    LEAVE_GAME_CONFIRMATION_NO: "deny-leave-game",
    CLYDE_GET_CARDS: "clyde-cards",
    CLYDE_PLAY: "play-as-clyde"
});

export const SelectIDs = Object.freeze({
    CHOOSE_CARD: "choose-card",
    CHOOSE_COLOR: "choose-color",
    FORCEFUL_DRAW: "draw-or-stack",
    CLYDE_CHOOSE_CARD: "choose-card-clyde",
    CLYDE_CHOOSE_COLOR: "choose-color-clyde",
    CLYDE_FORCEFUL_DRAW: "draw-or-stack-clyde",
    EDIT_GAME_SETTINGS: "change-settings"
});

export const SettingsIDs = Object.freeze({
    TIMEOUT_DURATION: "timeout-duration-setting",
    TIMEOUT_DURATION_MODAL: "tiemeout-duration-modal",
    TIMEOUT_DURATION_MODAL_SETTING: "timeout-setting-field",
    KICK_ON_TIMEOUT: "kick-on-timeout-setting",
    ALLOW_SKIPPING: "allow-skipping",
    ANTI_SABOTAGE: "anti-sabotage",
    ALLOW_CARD_STACKING: "allow-stacking"
});
