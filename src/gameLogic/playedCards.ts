import { ComponentBuilder } from "@oceanicjs/builders";
import { ComponentInteraction, ComponentTypes, MessageActionRow, MessageFlags } from "oceanic.js";

import { deleteMessage, sendMessage } from "../client.js";
import { cardEmotes, cards, colors, SelectIDs, uniqueVariants, variants } from "../constants.js";
import { config } from "../index.js";
import timeouts from "../timeouts.js";
import { Card, UnoGame } from "../types.js";
import { getUsername, next, PickCardSelect, toTitleCase, wasLastTurnBlocked } from "../utils.js";
import { games, onTimeout, sendGameMessage } from "./index.js";

export function onColorPlayed(ctx: ComponentInteraction<ComponentTypes.STRING_SELECT>, game: UnoGame<true>) {
    const { currentPlayer } = game;
    if (currentPlayer !== ctx.member.id) return;

    const cardPlayed = ctx.data.values.raw[0] as `${typeof colors[number]}-${typeof uniqueVariants[number]}`;
    const [color, variant] = cardPlayed.split("-") as [typeof colors[number], typeof uniqueVariants[number]];
    let extraInfo = "";

    if (game.lastPlayer.id === game.currentPlayer) game.lastPlayer.duration++;
    else game.lastPlayer = { id: game.currentPlayer, duration: 0 };

    if (variant === "+4") {
        const nextPlayer = next(game.players, game.players.indexOf(ctx.member.id));
        if (game.settings.allowStacking && game.cards[nextPlayer].some(c => c === "+4" || c === `${color}-+2`)) {
            game.drawStackCounter += 4;
        }
        else {
            const { cards, newDeck } = game.draw(4 + game.drawStackCounter);
            game.cards[nextPlayer].push(...cards);
            game.deck = newDeck;
            extraInfo = `**${getUsername(nextPlayer, true, ctx.guild)}** drew **${4 + game.drawStackCounter}** cards and was skipped`;
            game.drawStackCounter = 0;
            game.currentPlayer = next(game.players, game.players.indexOf(game.currentPlayer));
        }
    }

    game.currentCard = variant;
    game.currentCardColor = color;
    game.cards[ctx.member.id].splice(game.cards[ctx.member.id].indexOf(variant), 1);
    game.currentPlayer = next(game.players, game.players.indexOf(game.currentPlayer));
    ctx.deleteOriginal();
    if (game.cards[ctx.member.id].length === 0) return;
    sendMessage(ctx.channel.id, `
    ${`**${getUsername(ctx.member.id, true, ctx.guild)}** played ${cardEmotes[variant]} ${toTitleCase(variant)}, switching the color to ${color}`}\
    ${extraInfo.length ? `\n${extraInfo}` : ""}
    `);

    sendGameMessage(game);
}

export function onForceDrawPlayed(ctx: ComponentInteraction<ComponentTypes.STRING_SELECT>, game: UnoGame<true>) {
    if (game.currentPlayer !== ctx.member.id) return;
    const cardPlayed = ctx.data.values.raw[0] as Card | "draw-forceful";

    if (cardPlayed === "draw-forceful") {
        const { cards, newDeck } = game.draw(game.drawStackCounter);
        game.cards[game.currentPlayer].push(...cards);
        game.deck = newDeck;
        game.currentPlayer = next(game.players, game.players.indexOf(game.currentPlayer));
        sendMessage(ctx.channel.id, `**${getUsername(ctx.member.id, true, ctx.guild)}** drew ${game.drawStackCounter} cards`);
        game.drawStackCounter = 0;
        ctx.deleteOriginal();
        sendGameMessage(game);
    }
    else onCardPlayed(ctx, game, true);
}

export function onCardPlayed(ctx: ComponentInteraction<ComponentTypes.STRING_SELECT>, game: UnoGame<true>, ignoreDrawStack = false) {
    if (game.currentPlayer !== ctx.member.id) return;
    const cardPlayed = ctx.data.values.raw[0] as Card | "draw" | "skip";
    const [color, variant] = cardPlayed.split("-") as [typeof colors[number] | typeof uniqueVariants[number], typeof variants[number]];
    const [ccColor, ccVariant] = game.currentCard.split("-") as [typeof colors[number] | typeof uniqueVariants[number], typeof variants[number]];

    if (game.cards[ctx.member.id].indexOf(cardPlayed as Card) === -1 && !["draw", "skip"].includes(cardPlayed)) return ctx.createFollowup({
        content: "nuh uh ☝️",
        flags: MessageFlags.EPHEMERAL
    });

    if (
        color !== ccColor && color !== game.currentCardColor
        && variant !== ccVariant && !["draw", "skip", ...uniqueVariants].includes(color)
    ) return ctx.createFollowup({
        content: "You can't play that card",
        flags: MessageFlags.EPHEMERAL
    });
    if (game.drawStackCounter && !ignoreDrawStack) return ctx.createFollowup({
        content: "nuh uh ☝️",
        flags: MessageFlags.EPHEMERAL
    });

    if (uniqueVariants.includes(color)) {
        return ctx.createFollowup({
            content: "Choose a color",
            components: new ComponentBuilder<MessageActionRow>()
                .addSelectMenu({
                    customID: SelectIDs.CHOOSE_COLOR,
                    options: Object.values(colors).map(c => {
                        return {
                            label: toTitleCase(c),
                            value: `${c}-${color}`
                        };
                    }),
                    type: ComponentTypes.STRING_SELECT,
                })
                .toJSON()
        });
    }

    if (cardPlayed === "skip" && (!game.settings.allowSkipping || (game.lastPlayer.id !== game.currentPlayer && !wasLastTurnBlocked(game))))
        return ctx.createFollowup({
            content: "https://cdn.discordapp.com/attachments/1077657001330487316/1078347206366597180/how.jpg",
            flags: MessageFlags.EPHEMERAL
        });
    if (game.lastPlayer.id === game.currentPlayer) game.lastPlayer.duration++;
    else game.lastPlayer = { id: game.currentPlayer, duration: 0 };

    let extraInfo = "";
    if (cardPlayed === "draw") {
        if (game.lastPlayer.duration >= 4 && game.settings.antiSabotage) {
            game.players.splice(game.players.indexOf(ctx.member.id), 1);
            sendMessage(ctx.channel.id, `Removed **${getUsername(game.lastPlayer.id, true, ctx.guild)}** for attempting to sabotage the game`);
            if (game.players.length <= 1) return;
            game.currentPlayer = next(game.players, game.players.indexOf(game.currentPlayer));
            game.lastPlayer.duration = 0;

            return sendGameMessage(game);
        } else {
            const { cards: newCards, newDeck } = game.draw(1);
            game.cards[ctx.member.id].push(newCards[0]);
            game.cards[ctx.member.id].sort((a, b) => cards.indexOf(a) - cards.indexOf(b));
            game.deck = newDeck;
            if (game.settings.allowSkipping) {
                const components = PickCardSelect(game, ctx.member.id);
                if (components) ctx.editOriginal({
                    content: config.emoteless
                        ? `You drew a ${cardEmotes[newCards[0]]} ${toTitleCase(newCards[0])}`
                        : `${game.cards[ctx.member.id].map(c => cardEmotes[c]).join(" ")}
You drew ${cardEmotes[newCards[0]]}`,
                    components
                });
            }
            else
                ctx.deleteOriginal();
        }
    }

    else if (cardPlayed === "skip") {
        game.currentPlayer = next(game.players, game.players.indexOf(game.currentPlayer));
        ctx.deleteOriginal();
    }

    else {
        game.currentCard = cardPlayed;
        game.currentCardColor = color as typeof colors[number];
        game.cards[ctx.member.id].splice(game.cards[ctx.member.id].indexOf(cardPlayed), 1);

        if (variant === "reverse") {
            game.players = game.players.reverse();
            if (game.players.length === 2) {
                game.currentPlayer = next(game.players, game.players.indexOf(game.currentPlayer));
                extraInfo = `**${getUsername(game.currentPlayer, true, ctx.guild)}** was skipped`;
            }
        }

        if (variant === "+2") {
            const nextPlayer = next(game.players, game.players.indexOf(ctx.member.id));
            if (game.settings.allowStacking && game.cards[nextPlayer].some(c => c === "+4" || c.endsWith("+2"))) {
                game.drawStackCounter += 2;
            }
            else if (game.cards[ctx.member.id].length > 0) {
                const { cards, newDeck } = game.draw(2 + game.drawStackCounter);
                game.cards[nextPlayer].push(...cards);
                game.deck = newDeck;
                extraInfo = `**${getUsername(nextPlayer, true, ctx.guild)}** drew **${2 + game.drawStackCounter}** cards and was skipped`;
                game.drawStackCounter = 0;
                game.currentPlayer = next(game.players, game.players.indexOf(game.currentPlayer));
            }
        }

        if (variant === "block") {
            game.currentPlayer = next(game.players, game.players.indexOf(game.currentPlayer));
            extraInfo = `**${getUsername(game.currentPlayer, true, ctx.guild)}** was skipped`;
        }
        if (game.settings.allowSkipping)
            game.currentPlayer = next(game.players, game.players.indexOf(game.currentPlayer));
        ctx.deleteOriginal();
    }

    if (!game.settings.allowSkipping)
        game.currentPlayer = next(game.players, game.players.indexOf(game.currentPlayer));
    game.cards[ctx.member.id].sort((a, b) => cards.indexOf(a) - cards.indexOf(b));

    if (game.cards[ctx.member.id].length !== 0) {
        sendMessage(ctx.channel.id,
            `${cardPlayed === "draw"
                ? `**${getUsername(ctx.member.id, true, ctx.guild)}** drew a card`
                : cardPlayed === "skip"
                    ? `**${getUsername(ctx.member.id, true, ctx.guild)}** skipped their turn`
                    : `**${getUsername(ctx.member.id, true, ctx.guild)}** played ${cardEmotes[cardPlayed]} ${toTitleCase(cardPlayed)}`}\
        ${extraInfo.length ? `\n${extraInfo}` : ""}`
        );
        if (cardPlayed !== "draw" || !game.settings.allowSkipping) {
            sendGameMessage(game);
        } else {
            timeouts.set(game.channelID, () => onTimeout(game, game.currentPlayer), game.settings.timeoutDuration * 1000);
            games[ctx.message.channel.id] = game;
        }
    } else deleteMessage(game.message);
}
