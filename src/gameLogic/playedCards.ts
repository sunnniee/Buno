import { ButtonStyles, ComponentInteraction, ComponentTypes, MessageActionRow, MessageFlags } from "oceanic.js"
import { Card, UnoGame } from "../types.js"
import { cardArrayToCount, games, makeGameMessage, next, toTitleCase, wasLastTurnBlocked, onTimeout, getPlayerMember } from "./index.js"
import { deleteMessage, sendMessage } from "../client.js"
import { cardEmotes, colors, GameButtons, PickCardSelect, SelectIDs, variants, uniqueVariants } from "../constants.js"
import { ComponentBuilder } from "@oceanicjs/builders"

function win(ctx: ComponentInteraction<ComponentTypes.STRING_SELECT>, card: Card) {
    clearTimeout((games[ctx.channel.id] as UnoGame<true>).timeout)
    delete games[ctx.channel.id]
    sendMessage(ctx.channel.id, {
        content: `**${ctx.member.nick ?? ctx.member.username}** played ${cardEmotes[card]} ${toTitleCase(card)}, and won`,
        components: new ComponentBuilder<MessageActionRow>()
            .addInteractionButton({
                style: ButtonStyles.SUCCESS,
                label: "gg",
                emoji: ComponentBuilder.emojiToPartial("🏆", "default"),
                disabled: true,
                customID: "we-have-a-nerd-here🤓"
            })
            .toJSON()
    })
}

export function onColorPlayed(ctx: ComponentInteraction<ComponentTypes.STRING_SELECT>, game: UnoGame<true>) {
    const { currentPlayer } = game
    if (currentPlayer !== ctx.member.id) return
    const cardPlayed = ctx.data.values.raw[0]
    const [color, variant] = cardPlayed.split("-") as [typeof colors[number], typeof uniqueVariants[number]]
    let extraInfo = ""
    if (game.lastPlayer.id === game.currentPlayer) game.lastPlayer.duration++
    else game.lastPlayer = { id: game.currentPlayer, duration: 0 }
    if (variant === "+4") {
        const nextPlayer = next(game.players, game.players.indexOf(ctx.member.id))
        if (game.settings.allowStacking && game.cards[nextPlayer].some(c => c === "+4" || c === `${color}-+2`)) {
            game.drawStackCounter += 4
        }
        else {
            const { cards, newDeck } = game.draw(4 + game.drawStackCounter)
            game.cards[nextPlayer] = game.cards[nextPlayer].concat(cards)
            game.deck = newDeck
            const trolledMember = getPlayerMember(game, nextPlayer)
            extraInfo = `**${trolledMember.nick ?? trolledMember.username}** drew ${4 + game.drawStackCounter} cards and was skipped`
            game.drawStackCounter = 0
            game.currentPlayer = next(game.players, game.players.indexOf(game.currentPlayer))
        }
    }
    game.cards[ctx.member.id].splice(game.cards[ctx.member.id].indexOf(variant), 1)
    game.currentCard = variant
    game.currentCardColor = color
    game.currentPlayer = next(game.players, game.players.indexOf(game.currentPlayer))
    ctx.deleteOriginal()
    deleteMessage(game.message)
    if (game.cards[ctx.member.id].length === 0) return win(ctx, variant)
    sendMessage(ctx.channel.id, `
    ${`**${ctx.member.nick ?? ctx.member.username}** played ${cardEmotes[variant]} ${toTitleCase(variant)}, switching the color to ${color}`}\
    ${extraInfo.length ? `\n${extraInfo}` : ""}
    `)
    sendMessage(ctx.message.channel.id, {
        content: `<@${game.currentPlayer}> it's now your turn`,
        allowedMentions: { users: true },
        embeds: [makeGameMessage(game)],
        components: GameButtons
    }).then(msg => {
        game.message = msg
        games[ctx.message.channelID] = game
    })
}

export function onForceDrawPlayed(ctx: ComponentInteraction<ComponentTypes.STRING_SELECT>, game: UnoGame<true>) {
    if (game.currentPlayer !== ctx.member.id) return
    const cardPlayed = ctx.data.values.raw[0] as Card | "draw-forceful"
    if (cardPlayed === "draw-forceful") {
        const { cards, newDeck } = game.draw(game.drawStackCounter)
        game.cards[game.currentPlayer] = game.cards[game.currentPlayer].concat(cards)
        game.deck = newDeck
        game.currentPlayer = next(game.players, game.players.indexOf(game.currentPlayer))
        sendMessage(ctx.channel.id, `**${ctx.member.nick ?? ctx.member.username}** drew ${game.drawStackCounter} cards`)
        game.drawStackCounter = 0
        ctx.deleteOriginal()
        deleteMessage(game.message)
        sendMessage(ctx.channel.id, {
            content: `<@${game.currentPlayer}>, it's now your turn`,
            embeds: [makeGameMessage(game)],
            components: GameButtons,
            allowedMentions: { users: true }
        }).then(msg => {
            game.message = msg
            games[ctx.message.channel.id] = game
        })
    } else onCardPlayed(ctx, game, true)
}

export function onCardPlayed(ctx: ComponentInteraction<ComponentTypes.STRING_SELECT>, game: UnoGame<true>, ignoreDrawStack = false) {
    if (game.currentPlayer !== ctx.member.id) return
    const cardPlayed = ctx.data.values.raw[0] as Card | "draw" | "skip"
    const [color, variant] = cardPlayed.split("-") as [typeof colors[number] | typeof uniqueVariants[number], typeof variants[number] | undefined]
    const [ccColor, ccVariant] = game.currentCard.split("-") as [typeof colors[number] | typeof uniqueVariants[number], typeof variants[number] | undefined]
    const cards = game.cards[ctx.member.id]
    if (cards.indexOf(cardPlayed as any) === -1 && !["draw", "skip"].includes(cardPlayed)) return ctx.createFollowup({
        content: "https://cdn.discordapp.com/attachments/1077657001330487316/1078347206366597180/how.jpg",
        flags: MessageFlags.EPHEMERAL
    })
    if (
        color !== ccColor && color !== game.currentCardColor
        && variant !== ccVariant && !["draw", "skip", ...uniqueVariants].includes(color)
    ) return ctx.createFollowup({
        content: "You can't play that card",
        flags: MessageFlags.EPHEMERAL
    })
    if (game.drawStackCounter && !ignoreDrawStack) return ctx.createFollowup({
        content: "https://tenor.com/view/nuh-uh-24435520",
        flags: MessageFlags.EPHEMERAL
    })
    if (uniqueVariants.includes(color as typeof uniqueVariants[number])) {
        return ctx.editOriginal({
            content: "Choose a color",
            components: new ComponentBuilder<MessageActionRow>()
                .addSelectMenu({
                    customID: SelectIDs.CHOOSE_COLOR,
                    options: Object.values(colors).map(c => {
                        return {
                            label: toTitleCase(c),
                            value: `${c}-${color}`
                        }
                    }),
                    type: ComponentTypes.STRING_SELECT,
                })
                .toJSON()
        })
    }
    if (cardPlayed === "skip" && (!game.settings.allowSkipping || (game.lastPlayer.id !== game.currentPlayer && !wasLastTurnBlocked(game))))
        return ctx.createFollowup({
            content: "https://cdn.discordapp.com/attachments/1077657001330487316/1078347206366597180/how.jpg",
            flags: MessageFlags.EPHEMERAL
        })
    if (game.lastPlayer.id === game.currentPlayer) game.lastPlayer.duration++
    else game.lastPlayer = { id: game.currentPlayer, duration: 0 }
    clearTimeout(game.timeout)
    game.timeout = setTimeout(() => onTimeout(game), game.settings.timeoutDuration * 1000)

    let extraInfo = ""
    if (cardPlayed === "draw") {
        if (game.lastPlayer.duration >= 5 && game.settings.antiSabotage) {
            game.players.splice(game.players.indexOf(ctx.member.id), 1)
            game.currentPlayer = next(game.players, game.players.indexOf(game.currentPlayer))
            game.lastPlayer.duration = 0
            const kickedPlayer = getPlayerMember(game, game.lastPlayer.id)
            sendMessage(ctx.channel.id, `Removed **${kickedPlayer.nick ?? kickedPlayer.username}** for attempting to sabotage the game`)
        } else {
            const { cards, newDeck } = game.draw(1)
            game.cards[ctx.member.id].push(cards[0])
            game.deck = newDeck
            ctx.editOriginal({
                content: `Choose a card\nYour cards: ${game.cards[ctx.member.id].map(c => cardEmotes[c]).join(" ")}`,
                components: PickCardSelect(game, cardArrayToCount(game.cards[ctx.member.id]))
            })
        }
    }
    else if (cardPlayed === "skip") {
        game.currentPlayer = next(game.players, game.players.indexOf(game.currentPlayer))
        ctx.deleteOriginal()
    }
    else {
        game.cards[ctx.member.id].splice(cards.indexOf(cardPlayed), 1)
        game.currentCard = cardPlayed
        game.currentCardColor = color as typeof colors[number]
        if (variant === "reverse") {
            game.players = game.players.reverse()
            if (game.players.length === 2) {
                game.currentPlayer = next(game.players, game.players.indexOf(game.currentPlayer))
                const trolledMember = getPlayerMember(game, game.currentPlayer)
                extraInfo = `**${trolledMember.nick ?? trolledMember.username}** was skipped`
            }
        }
        if (variant === "+2") {
            const nextPlayer = next(game.players, game.players.indexOf(ctx.member.id))
            if (game.settings.allowStacking && game.cards[nextPlayer].some(c => c === "+4" || c === `${game.currentCardColor}-+2`)) {
                game.drawStackCounter += 2
            }
            else {
                const { cards, newDeck } = game.draw(2 + game.drawStackCounter)
                game.cards[nextPlayer] = game.cards[nextPlayer].concat(cards)
                game.deck = newDeck
                const trolledMember = getPlayerMember(game, nextPlayer)
                extraInfo = `**${trolledMember.nick ?? trolledMember.username}** drew ${2 + game.drawStackCounter} cards and was skipped`
                game.drawStackCounter = 0
                game.currentPlayer = next(game.players, game.players.indexOf(game.currentPlayer))
            }
        }
        if (variant === "block") {
            game.currentPlayer = next(game.players, game.players.indexOf(game.currentPlayer))
            const trolledMember = getPlayerMember(game, game.currentPlayer)
            extraInfo = `**${trolledMember.nick ?? trolledMember.username}** was skipped`
        }
        if (game.settings.allowSkipping) game.currentPlayer = next(game.players, game.players.indexOf(game.currentPlayer))
        ctx.deleteOriginal()
    }
    if (!game.settings.allowSkipping) game.currentPlayer = next(game.players, game.players.indexOf(game.currentPlayer))
    if (cardPlayed !== "draw") deleteMessage(game.message)
    if (game.cards[ctx.member.id].length === 0) {
        win(ctx, cardPlayed as Card)
    } else {
        sendMessage(ctx.channel.id,
            `${cardPlayed === "draw"
                ? `**${ctx.member.nick ?? ctx.member.username}** drew a card`
                : cardPlayed === "skip"
                    ? `**${ctx.member.nick ?? ctx.member.username}** skipped their turn`
                    : `**${ctx.member.nick ?? ctx.member.username}** played ${cardEmotes[cardPlayed]} ${toTitleCase(cardPlayed)}`}\
        ${extraInfo.length ? `\n${extraInfo}` : ""}`
        )
        if (cardPlayed !== "draw") {
            sendMessage(ctx.channel.id, {
                content: `<@${game.currentPlayer}>, it's now your turn`,
                embeds: [makeGameMessage(game)],
                components: GameButtons,
                allowedMentions: { users: true }
            }).then(msg => {
                game.message = msg
                games[ctx.message.channel.id] = game
            })
        } else {
            games[ctx.message.channel.id] = game
        }
    }
}
