import { respond } from "../client.js"
import { Command, UnoGame } from "../types"
import { ComponentBuilder } from "@oceanicjs/builders"
import { ButtonStyles, MessageActionRow } from "oceanic.js"
import { games, makeStartMessage } from "../gameLogic/index.js"
import { ButtonIDs } from "../constants.js"

export const cmd = {
    name: "uno",
    execute: (msg, args) => {
        if (games[msg.channelID]) return respond(msg, "someone already started a game")
        const gameObj: UnoGame<false> = {
            started: false,
            host: msg.author.id,
            message: msg,
            players: [msg.author.id],
        }
        respond(msg, {
            embeds: [makeStartMessage(gameObj)],
            components: new ComponentBuilder<MessageActionRow>()
                .addInteractionButton({
                    style: ButtonStyles.PRIMARY,
                    customID: ButtonIDs.JOIN_GAME,
                    label: "Join",
                })
                .addInteractionButton({
                    style: ButtonStyles.DANGER,
                    customID: ButtonIDs.LEAVE_GAME_BEFORE_START,
                    emoji: ComponentBuilder.emojiToPartial("🛑", "default")
                })
                .addInteractionButton({
                    style: ButtonStyles.PRIMARY,
                    customID: ButtonIDs.START_GAME,
                    emoji: ComponentBuilder.emojiToPartial("▶", "default")
                })
                .addRow()
                .addInteractionButton({
                    style: ButtonStyles.SECONDARY,
                    customID: ButtonIDs.EDIT_GAME_SETTINGS,
                    label: "Settings (host only)",
                    emoji: ComponentBuilder.emojiToPartial("⚙", "default")
                })
                .toJSON()
        })
        games[msg.channelID] = gameObj
    },
} as Command
