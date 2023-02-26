import { ComponentBuilder } from "@oceanicjs/builders"
import { MessageActionRow, ButtonStyles, ComponentTypes } from "oceanic.js"
import { toTitleCase, wasLastTurnSkipped } from "./gameLogic/index.js"
import { Card, UnoGame } from "./types.js"

export const prefix = "]"

export const colors = ["red", "yellow", "green", "blue",] as const
export const variants = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+2", "reverse", "block",] as const
export const uniqueVariants = ["wild", "+4",] as const
export const cards = (colors
    .map(c => variants.map(v => `${c}-${v}`))
    .flat() as Card[])
    .concat(uniqueVariants)
// TODO: clone uno card emotes to a server
export const cardEmotes: { [k in Card]: string } = Object.fromEntries(
    cards.map(c => [c, "<:SaulGoodman_Stare:1013330239641882645>"])
) as any
//    ^ this is temporary anyway so idc

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
export const defaultTimeoutDuration = 45_000

export const ButtonIDs = Object.freeze({
    JOIN_GAME: "join",
    LEAVE_GAME_BEFORE_START: "leave",
    EDIT_GAME_SETTINGS: "game-settings",
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
