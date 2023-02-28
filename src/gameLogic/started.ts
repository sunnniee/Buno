import { ButtonIDs, cardEmotes, onMsgError, SelectCardMenu } from "../constants.js"
import { ButtonStyles, ComponentInteraction, ComponentTypes, MessageActionRow, MessageFlags } from "oceanic.js"
import { UnoGame } from "../types.js"
import { games, makeGameMessage, cardArrayToCount, nextOrZero } from "./index.js"
import { ComponentBuilder } from "@oceanicjs/builders"
import { client, sendMessage } from "../client.js"

export function onGameButtonPress(ctx: ComponentInteraction<ComponentTypes.BUTTON>, game: UnoGame<true>) {
    switch (ctx.data.customID as typeof ButtonIDs[keyof typeof ButtonIDs]) {
        case ButtonIDs.PLAY_CARD: {
            if (!game.players.includes(ctx.member.id)) return ctx.createFollowup({
                content: "nuh uh",
                flags: MessageFlags.EPHEMERAL
            }).catch(e => onMsgError(e, ctx))
            ctx.createFollowup({
                content: `Choose a card\nYour cards: ${game.cards[ctx.member.id].map(c => cardEmotes[c]).join(" ")}`,
                components: SelectCardMenu(game, cardArrayToCount(game.cards[ctx.member.id])),
                flags: MessageFlags.EPHEMERAL
            }).catch(e => onMsgError(e, ctx))
            break
        }
        case ButtonIDs.LEAVE_GAME: {
            if (game.players.includes(ctx.member.id)) {
                game.players.splice(game.players.indexOf(ctx.member.id), 1)
                if (game.currentPlayer === ctx.member.id) game.currentPlayer = nextOrZero(game.players, game.players.indexOf(game.currentPlayer))
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
                games[ctx.channelID] = game
                ctx.editOriginal({
                    embeds: [makeGameMessage(game)]
                }).catch(e => onMsgError(e, ctx))
            }
            break
        }
    }
}
