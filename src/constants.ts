import { ComponentBuilder } from "@oceanicjs/builders"
import { MessageActionRow, ButtonStyles, ComponentTypes } from "oceanic.js"
import { toTitleCase, wasLastTurnSkipped } from "./gameLogic/index.js"
import { Card, UnoGame, UnoGameSettings } from "./types.js"

export const prefix = "]"

export const colors = ["red", "yellow", "green", "blue",] as const
export const variants = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+2", "reverse", "block",] as const
export const uniqueVariants = ["wild", "+4",] as const
export const cards = (colors
    .map(c => variants.map(v => `${c}-${v}`))
    .flat() as Card[])
    .concat(uniqueVariants)
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
    "red-block": "<:Rb:1079775711830736927>",
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
    "yellow-block": "<:Yb:1079775704679448656>",
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
    "blue-block": "<:Bb:1079775707569332285>",
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
    "green-block": "<:Gb:1079775709456760872>",
    "wild": "<:W:1079759132925628526>",
    "+4": "<:d4:1079758847155130439>",
}

// yes i like catppuccin how could you tell
export const rainbowColors = [
    0xf38ba8,
    0xfab387,
    0xf9e2af,
    0xa6e3a1,
    0x74e7bc,
    0xf5c2e7
] as const
export const defaultColor = 0x6c7086

export const defaultSettings: UnoGameSettings = Object.freeze({
    timeoutDuration: 45,
    kickOnTimeout: false
})

export const ButtonIDs = Object.freeze({
    JOIN_GAME: "join",
    LEAVE_GAME_BEFORE_START: "leave",
    EDIT_GAME_SETTINGS: "game-settings",
    DELETE_GAME: "delete-game",
    START_GAME: "start",
    PLAY_CARD: "play-game",
    LEAVE_GAME: "leave-game",
})
export const GameButtons = new ComponentBuilder<MessageActionRow>()
    .addInteractionButton({
        style: ButtonStyles.PRIMARY,
        customID: "play-game",
        label: "Play",
        emoji: ComponentBuilder.emojiToPartial("🃏", "default")
    })
    .addInteractionButton({
        style: ButtonStyles.DANGER,
        customID: "leave-game",
        emoji: ComponentBuilder.emojiToPartial("🚪", "default")
    })
    .toJSON()

export const SelectIDs = Object.freeze({
    CHOOSE_CARD: "choose-card",
    CHOOSE_COLOR: "choose-color"
})

export const SelectCardMenu = (game: UnoGame<true>, cards: { [k in Card]: number }) => new ComponentBuilder<MessageActionRow>()
    .addSelectMenu({
        customID: SelectIDs.CHOOSE_CARD,
        options: [
            ...Object.keys(cards).map(c => {
                return {
                    label: `${toTitleCase(c)}${cards[c] >= 2 ? ` x${cards[c]}` : ""}`,
                    value: c,
                    emoji: ComponentBuilder.emojiToPartial(cardEmotes[c], "custom")
                }
            }),
            {
                label: "Draw a card",
                value: "draw"
            }
        ].concat(game.lastPlayer === game.currentPlayer && !(game.players.length > 2 || wasLastTurnSkipped(game)) ? [{
            label: "Skip your turn",
            value: "skip"
        }] : []),
        type: ComponentTypes.STRING_SELECT
    })
    .toJSON()

export const EditSettingsModalIDs = Object.freeze({
    ROOT: "edit-settings-modal",
    TIMEOUT_DURATION: "timeout-duration-modal",
    KICK_ON_TIMEOUT: "kick-on-timeout-modal",
    KICK_ON_TIMEOUT_OPTION_ENABLED: "kick-enabled-modal",
    KICK_ON_TIMEOUT_OPTION_DISABLED: "kick-disabled-modal",
    KICK_ON_TIMEOUT_TEXT_INPUT: "kick-on-timeout-discordstupit-modal"
})
