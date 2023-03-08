import { ButtonIDs, cardEmotes, DrawStackedCardSelect, PickCardSelect } from "../constants.js"
import { ButtonStyles, ComponentInteraction, ComponentTypes, MessageActionRow, MessageFlags } from "oceanic.js"
import { UnoGame } from "../types.js"
import { games, sendGameMessage, cardArrayToCount, next } from "./index.js"
import { ComponentBuilder } from "@oceanicjs/builders"
import { client, sendMessage } from "../client.js"

export function leaveGame(ctx: ComponentInteraction<ComponentTypes.BUTTON>, game: UnoGame<true>) {
    if (game.players.includes(ctx.member.id)) {
        game.players.splice(game.players.indexOf(ctx.member.id), 1)
        if (game.currentPlayer === ctx.member.id) game.currentPlayer = next(game.players, game.players.indexOf(game.currentPlayer))
        sendMessage(ctx.channel.id, `**${ctx.member.nick ?? ctx.member.username}** left the game.`)
        if (game.players.length <= 1) {
            clearTimeout(game.timeout)
            delete games[ctx.channel.id]
            return sendMessage(ctx.channel.id, {
                content: `**${client.users.get(game.players[0])?.username ?? "Nobody"}** won by default`,
                components: new ComponentBuilder<MessageActionRow>()
                    .addInteractionButton({
                        style: ButtonStyles.SUCCESS,
                        emoji: ComponentBuilder.emojiToPartial("🏆", "default"),
                        disabled: true,
                        customID: "we-have-a-nerd-here🤓"
                    })
                    .toJSON()
            })
        }
        ctx.deleteOriginal()
        sendGameMessage(game)
    }
}

export function onGameButtonPress(ctx: ComponentInteraction<ComponentTypes.BUTTON>, game: UnoGame<true>) {
    switch (ctx.data.customID as typeof ButtonIDs[keyof typeof ButtonIDs]) {
        case ButtonIDs.PLAY_CARD: {
            if (!game.players.includes(ctx.member.id)) return ctx.createFollowup({
                content: "You aren't in the game!",
                flags: MessageFlags.EPHEMERAL
            })
            if (game.drawStackCounter) return ctx.createFollowup({
                content: "Choose an option",
                components: DrawStackedCardSelect(game, cardArrayToCount(game.cards[ctx.member.id])),
                flags: MessageFlags.EPHEMERAL
            })
            ctx.createFollowup({
                content: `Choose a card\nYour cards: ${game.cards[ctx.member.id].map(c => cardEmotes[c]).join(" ")}`,
                components: PickCardSelect(game, cardArrayToCount(game.cards[ctx.member.id])),
                flags: MessageFlags.EPHEMERAL
            })
            break
        }
        case ButtonIDs.LEAVE_GAME: {
            return ctx.createFollowup({
                content: "Are you sure you want to leave?",
                components: new ComponentBuilder<MessageActionRow>()
                    .addInteractionButton({
                        customID: ButtonIDs.LEAVE_GAME_CONFIRMATION_NO,
                        style: ButtonStyles.DANGER,
                        label: "No"
                    })
                    .addInteractionButton({
                        customID: ButtonIDs.LEAVE_GAME_CONFIRMATION_YES,
                        style: ButtonStyles.SUCCESS,
                        label: "Yes"
                    })
                    .toJSON(),
                flags: MessageFlags.EPHEMERAL
            })
        }
    }
}
