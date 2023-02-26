import { ButtonIDs, cardEmotes, defaultSettings, EditSettingsModalIDs, SelectCardMenu } from "../constants.js"
import { ButtonStyles, ComponentInteraction, ComponentTypes, MessageActionRow, MessageFlags, ModalActionRow, TextInputStyles } from "oceanic.js"
import { UnoGame } from "../types.js"
import { games, makeGameMessage, cardArrayToCount, nextOrZero } from "./index.js"
import { ComponentBuilder } from "@oceanicjs/builders"
import { client, sendMessage } from "../client.js"

export function onSettingsModal(ctx: ComponentInteraction<ComponentTypes.BUTTON>) {
    const game = games[ctx.channel.id]
    if (!game) return ctx.deferUpdate()
    if (game.host !== ctx.member.id) return ctx.createFollowup({
        content: "This can only be used by the game's host",
        flags: MessageFlags.EPHEMERAL
    })
    ctx.createModal({
        title: "Edit game settings",
        customID: EditSettingsModalIDs.ROOT,
        components: new ComponentBuilder<ModalActionRow>()
            .addTextInput({
                customID: EditSettingsModalIDs.TIMEOUT_DURATION,
                label: "Turn duration(in seconds, >20, -1 to disable)",
                style: TextInputStyles.SHORT,
                value: `${(game.settings.timeoutDuration === Number.MAX_SAFE_INTEGER ? "-1" : game.settings.timeoutDuration)
                    ?? defaultSettings.timeoutDuration}`,
                placeholder: `default: ${defaultSettings.timeoutDuration}`
            })
            .addTextInput({
                customID: EditSettingsModalIDs.KICK_ON_TIMEOUT_TEXT_INPUT,
                label: "Kick on timeout (type enabled/disabled)",
                style: TextInputStyles.SHORT,
                value: game.settings.kickOnTimeout ? "Enabled" : "Disabled",
                placeholder: "can't use select menus in modals - blame discord"
            })
            /* can't use select menu's in modals :wahhgone" */
            // .addSelectMenu({
            //     customID: EditSettingsModalIDs.KICK_ON_TIMEOUT,
            //     type: ComponentTypes.STRING_SELECT,
            //     options: [{
            //         label: "Kick on timeout disabled",
            //         value: EditSettingsModalIDs.KICK_ON_TIMEOUT_OPTION_DISABLED,
            //         default: !game.settings.kickOnTimeout
            //     }, {
            //         label: "Kick on timeout enabled",
            //         value: EditSettingsModalIDs.KICK_ON_TIMEOUT_OPTION_ENABLED,
            //         default: game.settings.kickOnTimeout
            //     }],
            //     placeholder: "Kick on timeout (default: disabled)",
            // })
            .toJSON()
    })
}

export function onGameButtonPress(ctx: ComponentInteraction<ComponentTypes.BUTTON>, game: UnoGame<true>) {
    switch (ctx.data.customID as typeof ButtonIDs[keyof typeof ButtonIDs]) {
        case ButtonIDs.PLAY_CARD: {
            if (!game.players.includes(ctx.member.id)) return ctx.createFollowup({
                content: "nuh uh",
                flags: MessageFlags.EPHEMERAL
            })
            ctx.createFollowup({
                content: `Choose a card\nYour cards: ${game.cards[ctx.member.id].map(c => cardEmotes[c]).join(" ")}`,
                components: SelectCardMenu(game, cardArrayToCount(game.cards[ctx.member.id])),
                flags: MessageFlags.EPHEMERAL
            })
            break
        }
        case ButtonIDs.LEAVE_GAME: {
            if (game.players.includes(ctx.member.id)) {
                game.players.splice(game.players.indexOf(ctx.member.id), 1)
                if (game.currentPlayer === ctx.member.id) game.currentPlayer = nextOrZero(game.players, game.players.indexOf(game.currentPlayer))
                sendMessage(ctx.channel.id, `**${ctx.member.nick ?? ctx.member.username}** left the game.`)
                if (game.players.length <= 1) {
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
                })
            }
            break
        }
    }
}
