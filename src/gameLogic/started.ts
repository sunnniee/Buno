import { ComponentBuilder } from "@oceanicjs/builders";
import { ButtonStyles, ComponentInteraction, ComponentTypes, MessageActionRow, MessageFlags } from "oceanic.js";

import { sendMessage } from "../client.js";
import { DrawStackedCardSelect, PickCardSelect } from "../components.js";
import { ButtonIDs, cardEmotes } from "../constants.js";
import database from "../database.js";
import { config } from "../index.js";
import { UnoGame } from "../types.js";
import { cardArrayToCount, getUsername, next, toTitleCase } from "../utils.js";
import { sendGameMessage } from "./index.js";
import { makeDrawCardProxy } from "./notStarted.js";

export function leaveGame(ctx: ComponentInteraction<ComponentTypes.BUTTON>, game: UnoGame<true>) {
    if (game.players.includes(ctx.member.id)) {
        game.players.splice(game.players.indexOf(ctx.member.id), 1);
        game.playersWhoLeft.push(ctx.member.id);
        delete game.cards[ctx.member.id];
        if (game.currentPlayer === ctx.member.id) game.currentPlayer = next(game.players, game.players.indexOf(game.currentPlayer));

        sendMessage(ctx.channel.id, `**${getUsername(ctx.member.id, true, ctx.guild)}** left the game.`);
        ctx.deleteOriginal();

        if (game.players.length <= 1) return;
        sendGameMessage(game);
    }
}

export function onGameButtonPress(ctx: ComponentInteraction<ComponentTypes.BUTTON>, game: UnoGame<true>) {
    switch (ctx.data.customID as typeof ButtonIDs[keyof typeof ButtonIDs]) {
        case ButtonIDs.VIEW_CARDS: {
            if (!game.players.includes(ctx.member.id)) return ctx.createFollowup({
                content: "You aren't in the game!",
                flags: MessageFlags.EPHEMERAL
            });
            if (config.emoteless) return ctx.createFollowup({
                content: game.cards[ctx.member.id].map(c => `${cardEmotes[c]} ${toTitleCase(c)}`).join(", "),
                flags: MessageFlags.EPHEMERAL
            });

            ctx.createFollowup({
                content: game.cards[ctx.member.id].map(c => cardEmotes[c]).join(" "),
                flags: MessageFlags.EPHEMERAL
            });
            break;
        }

        case ButtonIDs.PLAY_CARD: {
            if (!game.players.includes(ctx.member.id)) return ctx.createFollowup({
                content: "You aren't in the game!",
                flags: MessageFlags.EPHEMERAL
            });
            if (game.currentPlayer !== ctx.user.id) return ctx.createFollowup({
                content: "It's not your turn!",
                flags: MessageFlags.EPHEMERAL
            });
            if (game.drawStackCounter) return ctx.createFollowup({
                content: `You have to respond or draw **${game.drawStackCounter}** cards`,
                components: DrawStackedCardSelect(game, cardArrayToCount(game.cards[ctx.member.id])),
                flags: MessageFlags.EPHEMERAL
            });

            const components = PickCardSelect(game, ctx.member.id);
            if (components) ctx.createFollowup({
                content: config.emoteless ? null : game.cards[ctx.member.id].map(c => cardEmotes[c]).join(" "),
                components,
                flags: MessageFlags.EPHEMERAL
            });
            break;
        }

        case ButtonIDs.LEAVE_GAME: {
            if (!game.players.includes(ctx.member.id)) return;

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
            });
        }

        case ButtonIDs.JOIN_MID_GAME: {
            if (game.players.includes(ctx.member.id)) return;
            if (game.playersWhoLeft.includes(ctx.member.id)) return ctx.createFollowup({
                content: "You can't rejoin a game you left!",
                flags: MessageFlags.EPHEMERAL
            });

            game.players.push(ctx.member.id);
            database.getOrCreate(ctx.guild.id, ctx.member.id);
            // in ascending order
            const cardCounts = Object.values(game.cards).map(c => c.length).sort((a, b) => a - b);
            // amount of cards is the same as the player with the highest amount of cards
            // but at most 5 above the 2nd highest amount of cards
            const highest = cardCounts.pop();
            const secondHighest = cardCounts.pop();
            const { cards, newDeck } = game.draw(highest > secondHighest + 5 ? secondHighest + 5 : highest);
            game.cards[ctx.member.id] = new Proxy(cards, {
                set(t, p, n) {
                    makeDrawCardProxy(game, ctx.member.id, t, p, n);
                    return true;
                }
            });
            game.deck = newDeck;

            sendMessage(ctx.channel.id, `**${getUsername(ctx.member.id, true, ctx.guild)}** has joined the game!`);
            sendGameMessage(game, true);
            break;
        }

        case ButtonIDs.VIEW_GAME_SETTINGS: {
            return ctx.createFollowup({
                content: `Kick on timeout: **${game.settings.kickOnTimeout ? "Enabled" : "Disabled"}**
Skipping turns: **${game.settings.allowSkipping ? "Enabled" : "Disabled"}**
Stack +2's and +4's: **${game.settings.allowStacking ? "Enabled" : "Disabled"}**
Randomize order of players: **${game.settings.randomizePlayerList ? "Enabled" : "Disabled"}**
Resend game message: **${game.settings.resendGameMessage ? "Enabled" : "Disabled"}**
Can join mid game: **${game.settings.resendGameMessage ? "Yes" : "No"}**
Anti sabotage: **find out 🚎**`,
                flags: MessageFlags.EPHEMERAL
            });
        }
    }
}
