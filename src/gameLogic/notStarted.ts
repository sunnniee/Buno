import { respond } from "../client.js"
import { cards, ButtonIDs, uniqueVariants, defaultSettings, SettingsSelectMenu, SettingsIDs } from "../constants.js"
import { ComponentInteraction, ComponentTypes, MessageFlags, ModalActionRow, TextInputStyles } from "oceanic.js"
import { Card, UnoGame } from "../types.js"
import { games, sendGameMessage, makeStartMessage, shuffle, onTimeout } from "./index.js"
import { ComponentBuilder } from "@oceanicjs/builders"
import database from "../database.js"

const drawUntilNotSpecial = (game: UnoGame<true>) => {
    let card = game.draw(1).cards[0]
    while (uniqueVariants.includes(card as any)) card = game.draw(1).cards[0]
    return card
}
function dupe<T>(a: T[]): T[] { return a.concat(a) }

function startGame(game: UnoGame<false>) {
    if (game.players.length === 1 && !game._allowSolo)
        return respond(game.message, "You can't start a game by yourself!")
    game.players.forEach(id => {
        if (!database.get(game.guildID, id)) database.set(game.guildID, id, { wins: 0, losses: 0 })
    })
    games[game.channelID].started = true
    const startedGame = {
        started: true,
        players: game.players,
        host: game.host,
        deck: shuffle(dupe([...cards, ...uniqueVariants])),
        drawStackCounter: 0,
        currentPlayer: game.players[0],
        lastPlayer: { id: null, duration: 0 },
        settings: game.settings || { ...defaultSettings },
        timeout: setTimeout(() => onTimeout(startedGame), game.settings.timeoutDuration * 1000),
        channelID: game.channelID,
        guildID: game.guildID,
        _modified: game._modified
    } as UnoGame<true>
    startedGame.draw = drawFactory(startedGame)
    startedGame.cards = Object.fromEntries(game.players.map(p => [p, startedGame.draw(7).cards]))
    startedGame.currentCard = drawUntilNotSpecial(startedGame)
    startedGame.currentCardColor = startedGame.currentCard.split("-")[0] as any
    startedGame.deck = startedGame.draw(0).newDeck
    sendGameMessage(startedGame)
}
function drawFactory(game: UnoGame<true>): (amount: number) => { cards: Card[], newDeck: Card[] } {
    let { deck } = game
    return (amount: number) => {
        if (deck.length < amount) deck = deck.concat(shuffle(dupe([...cards, ...uniqueVariants])))
        const takenCards = deck.splice(0, amount)
        return { cards: takenCards, newDeck: deck }
    }
}

export function makeSettingsModal(ctx: ComponentInteraction) {
    const game = games[ctx.channel.id]
    if (!game) return ctx.deferUpdate()
    if (game.host !== ctx.member.id) return ctx.createFollowup({
        content: "This can only be used by the game's host",
        flags: MessageFlags.EPHEMERAL
    })
    ctx.createModal({
        title: "Edit game settings",
        customID: SettingsIDs.TIMEOUT_DURATION_MODAL,
        components: new ComponentBuilder<ModalActionRow>()
            .addTextInput({
                customID: SettingsIDs.TIMEOUT_DURATION_MODAL_SETTING,
                label: "New duration (in seconds, >20, -1 to disable)",
                style: TextInputStyles.SHORT,
                value: `${((game.settings.timeoutDuration === Number.MAX_SAFE_INTEGER || game.settings.timeoutDuration < 0)
                    ? "-1" : game.settings.timeoutDuration)
                    ?? defaultSettings.timeoutDuration}`,
                placeholder: `default: ${defaultSettings.timeoutDuration}, max of 1 hour`
            })
            .toJSON()
    })
}
export function onSettingsChange(ctx: ComponentInteraction<ComponentTypes.STRING_SELECT>, game: UnoGame<false>) {
    switch (ctx.data.values.raw[0]) {
        case SettingsIDs.KICK_ON_TIMEOUT: {
            game.settings.kickOnTimeout = !game.settings.kickOnTimeout
            break
        }
        case SettingsIDs.ALLOW_SKIPPING: {
            game.settings.allowSkipping = !game.settings.allowSkipping
            break
        }
        case SettingsIDs.ANTI_SABOTAGE: {
            game.settings.antiSabotage = !game.settings.antiSabotage
            break
        }
        case SettingsIDs.ALLOW_CARD_STACKING: {
            game.settings.allowStacking = !game.settings.allowStacking
            break
        }
    }
    games[ctx.channel.id] = game
    ctx.editOriginal({
        components: SettingsSelectMenu(game)
    })
}

export function onGameJoin(ctx: ComponentInteraction<ComponentTypes.BUTTON>, game: UnoGame<false>) {
    switch (ctx.data.customID as typeof ButtonIDs[keyof typeof ButtonIDs]) {
        case ButtonIDs.JOIN_GAME: {
            if (!game.players.includes(ctx.member.id)) {
                game.players.push(ctx.member.id)
                games[ctx.channelID] = game
                ctx.editOriginal({
                    embeds: [makeStartMessage(game)]
                })
            }
            break
        }
        case ButtonIDs.LEAVE_GAME_BEFORE_START: {
            if (game.players.length > 1 && game.players.includes(ctx.member.id)) {
                game.players.splice(game.players.indexOf(ctx.member.id), 1)
                if (game.host === ctx.member.id) game.host = game.players[0]
                games[ctx.channelID] = game
                ctx.editOriginal({
                    embeds: [makeStartMessage(game)]
                })
            }
            break
        }
        case ButtonIDs.START_GAME: {
            if (game.host !== ctx.member.id) return ctx.createFollowup({
                content: "This can only be used by the game's host",
                flags: MessageFlags.EPHEMERAL
            })
            startGame(game)
            break
        }
        case ButtonIDs.EDIT_GAME_SETTINGS: {
            if (game.host !== ctx.member.id) return ctx.createFollowup({
                content: "This can only be used by the game's host",
                flags: MessageFlags.EPHEMERAL
            })
            ctx.createFollowup({
                content: "Click on a setting to change it",
                flags: MessageFlags.EPHEMERAL,
                components: SettingsSelectMenu(game)
            })
            break
        }
        case ButtonIDs.DELETE_GAME: {
            if (game.host !== ctx.member.id) return ctx.createFollowup({
                content: "This can only be used by the game's host",
                flags: MessageFlags.EPHEMERAL
            })
            respond(ctx.message, `👋 - game stopped by <@${ctx.member.id}>`)
                .then(() => ctx.deleteOriginal())
            delete games[ctx.channel.id]
            break
        }
    }
}
