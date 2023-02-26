import { respond, sendMessage } from "../client.js"
import { cards, ButtonIDs, uniqueVariants, GameButtons, defaultTimeoutDuration } from "../constants.js"
import { ComponentInteraction, ComponentTypes, MessageFlags } from "oceanic.js"
import { Card, UnoGame } from "../types.js"
import { games, makeGameMessage, makeStartMessage, shuffle, onTimeout } from "./index.js"

const drawUntilNotSpecial = (game: UnoGame<true>) => {
    let card = game.draw(1).cards[0]
    while (uniqueVariants.includes(card as any)) card = game.draw(1).cards[0]
    return card
}
function dupe<T>(a: T[]): T[] { return a.concat(a) }

async function startGame(game: UnoGame<false>) {
    const startedGame = {
        started: true,
        host: game.host,
        players: game.players,
        deck: shuffle(dupe([...cards, ...uniqueVariants])),
        currentPlayer: game.players[0],
        lastPlayer: null,
        timeout: setTimeout(() => onTimeout(startedGame), defaultTimeoutDuration),
        message: game.message
    } as UnoGame<true>
    startedGame.draw = drawFactory(startedGame)
    startedGame.cards = Object.fromEntries(game.players.map(p => [p, startedGame.draw(7).cards]))
    startedGame.currentCard = drawUntilNotSpecial(startedGame)
    startedGame.currentCardColor = startedGame.currentCard.split("-")[0] as any
    startedGame.deck = startedGame.draw(0).newDeck
    const msg = await sendMessage(game.message.channelID, {
        embeds: [makeGameMessage(startedGame)],
        components: GameButtons
    })
    startedGame.message = msg
    games[game.message.channelID] = startedGame
}
function drawFactory(game: UnoGame<true>): (amount: number) => { cards: Card[], newDeck: Card[] } {
    let { deck } = game
    return (amount: number) => {
        if (deck.length < amount) deck = deck.concat(shuffle([...cards, ...uniqueVariants]))
        const takenCards = deck.splice(0, amount)
        return { cards: takenCards, newDeck: deck }
    }
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
                content: "nuh uh",
                flags: MessageFlags.EPHEMERAL
            })
            startGame(game)
            break
        }
        case ButtonIDs.EDIT_GAME_SETTINGS: {
            if (game.host !== ctx.member.id) return ctx.createFollowup({
                content: "nuh uh",
                flags: MessageFlags.EPHEMERAL
            })
            respond(ctx.message, "todo")
            break
        }
    }
}
