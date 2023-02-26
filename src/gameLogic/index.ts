import { client, sendMessage } from "../client.js"
import { ComponentInteraction, ComponentTypes, MessageFlags } from "oceanic.js"
import { Card, UnoGame } from "../types.js"
import { EmbedBuilder } from "@oceanicjs/builders"
import { onGameJoin } from "./notStarted.js"
import { onGameButtonPress } from "./started.js"
import { cardEmotes, defaultColor, rainbowColors, SelectIDs, ButtonIDs, uniqueVariants, cards, GameButtons } from "../constants.js"
import { onCardPlayed, onColorPlayed } from "./playedCards.js"

export const games: { [channelId: string]: UnoGame<boolean> } = {}
export function hasStarted(game: UnoGame<boolean>): game is UnoGame<true> {
    return !!(game as any).currentPlayer
}
export const shuffle = (array: Card[]): Card[] => array
    .map(c => ({ c, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ c }) => c)
export const toTitleCase = (n: string) => n.split("-").map(w => `${w[0].toUpperCase()}${w.slice(1).toLowerCase()}`).join(" ")
export function nextOrZero(array: any[], n: number) {
    if (n < array.length - 1) return array[n + 1]
    else return array[0]
}
export const wasLastTurnSkipped = (game: UnoGame<true>) =>
    game.currentCard === "+4" || ["+2", "block"].includes(game.currentCard.split("-")[1])
export const cardArrayToCount = (a: Card[]) => a
    .sort((a, b) => cards.indexOf(a) - cards.indexOf(b))
    .reduce((obj, c) => { obj[c] = (obj[c] + 1) || 1; return obj }, {} as { [k in Card]: number })

export function onTimeout(game: UnoGame<true>) {
    game.currentPlayer = nextOrZero(game.players, game.players.indexOf(game.currentPlayer))
    sendMessage(game.message.channel.id, {
        content: `<@${game.currentPlayer}>, it's now your turn`,
        embeds: [makeGameMessage(game)],
        components: GameButtons,
        allowedMentions: { users: true }
    }).then(msg => {
        game.message = msg
        games[game.message.channelID] = game
    })
}

export function makeStartMessage(game: UnoGame<false>) {
    return new EmbedBuilder()
        .setTitle("The Buno.")
        .setDescription(`
Current game host: ${client.users.get(game.host)?.username ?? `<@${game.host}>`}
\`\`\`
${game.players.map(p => client.users.get(p)?.username ?? `Unknown [${p}]`).join("\n")}
\`\`\`
    `)
        .setColor(defaultColor)
        .toJSON()
}
const makeGameLine = (game: UnoGame<true>, playerID: string, i: number) =>
    `${game.players.indexOf(game.currentPlayer) === i ? "+ " : game.cards[playerID].length <= 2 ? "- " : "  "}${client.users.get(playerID)?.username ?? `Unknown [${playerID}]`}: ${game.cards[playerID].length} card${game.cards[playerID].length === 1 ? "" : "s"}`
export function makeGameMessage(game: UnoGame<true>) {
    return new EmbedBuilder()
        .setTitle("The Buno.")
        .setDescription(`
Currently playing: **${client.users.get(game.currentPlayer)?.username ?? `<@${game.currentPlayer}>`}**
Current card: ${cardEmotes[game.currentCard]} ${toTitleCase(game.currentCard)} \
${uniqueVariants.includes(game.currentCard as typeof uniqueVariants[number]) ? ` (${game.currentCardColor})` : ""}
\`\`\`diff
${game.players.map((p, i) => makeGameLine(game, p, i)).join("\n")}
\`\`\`
`)
        .setColor(rainbowColors[game.players.indexOf(game.currentPlayer) % 7])
        .toJSON()
}

export function onButtonPress(ctx: ComponentInteraction<ComponentTypes.BUTTON>) {
    ctx.deferUpdate()
    const game = games[ctx.channel.id]
    switch (ctx.data.customID as typeof ButtonIDs[keyof typeof ButtonIDs]) {
        case ButtonIDs.JOIN_GAME:
        case ButtonIDs.LEAVE_GAME_BEFORE_START:
        case ButtonIDs.START_GAME:
        case ButtonIDs.EDIT_GAME_SETTINGS:
        case ButtonIDs.DELETE_GAME:
            if (!game || hasStarted(game)) return
            onGameJoin(ctx, game)
            break
        case ButtonIDs.PLAY_CARD:
        case ButtonIDs.LEAVE_GAME:
            if (!game || !hasStarted(game)) return
            onGameButtonPress(ctx, game)
            break
        default:
            return ctx.createFollowup({
                content: "??????????????",
                flags: MessageFlags.EPHEMERAL
            })
    }
}

export function onSelectMenu(ctx: ComponentInteraction<ComponentTypes.STRING_SELECT>) {
    ctx.deferUpdate()
    const game = games[ctx.channel.id]
    if (!game || !hasStarted(game)) return
    if (ctx.data.customID === SelectIDs.CHOOSE_CARD) onCardPlayed(ctx, game)
    else if (ctx.data.customID === SelectIDs.CHOOSE_COLOR) onColorPlayed(ctx, game)
}
