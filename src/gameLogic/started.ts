import { ButtonIDs, cardEmotes } from "../constants.js";
import { ButtonStyles, ComponentInteraction, ComponentTypes, MessageActionRow, MessageFlags } from "oceanic.js";
import { UnoGame } from "../types.js";
import { sendGameMessage } from "./index.js";
import { ComponentBuilder } from "@oceanicjs/builders";
import { sendMessage } from "../client.js";
import { cardArrayToCount, DrawStackedCardSelect, getUsername, next, PickCardSelect, shuffle, toTitleCase } from "../utils.js";
import { config } from "../index.js";

export function leaveGame(ctx: ComponentInteraction<ComponentTypes.BUTTON>, game: UnoGame<true>) {
    if (game.players.includes(ctx.member.id)) {
        game.players.splice(game.players.indexOf(ctx.member.id), 1);
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
                content: "Choose an option",
                components: DrawStackedCardSelect(game, cardArrayToCount(game.cards[ctx.member.id])),
                flags: MessageFlags.EPHEMERAL
            });
            ctx.createFollowup({
                content: game.cards[ctx.member.id].map(c => cardEmotes[c]).join(" "),
                components: PickCardSelect(game, cardArrayToCount(game.cards[ctx.member.id])),
                flags: MessageFlags.EPHEMERAL
            });
            break;
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
            });
        }
        case ButtonIDs.CLYDE_GET_CARDS: {
            if (game.host !== ctx.member.id) return ctx.createFollowup({
                content: "This can only be used by the game's host",
                flags: MessageFlags.EPHEMERAL
            });
            return ctx.createFollowup({
                content: `${toTitleCase(game.currentCard).toLowerCase()}. ${toTitleCase(shuffle(game.cards[config.clyde.id]).join(", ")).toLowerCase()}`,
                flags: MessageFlags.EPHEMERAL
            });
        }
        case ButtonIDs.CLYDE_PLAY: {
            if (game.host !== ctx.member.id) return ctx.createFollowup({
                content: "This can only be used by the game's host",
                flags: MessageFlags.EPHEMERAL
            });
            if (!game.players.includes(config.clyde.id)) return ctx.createFollowup({
                content: "You aren't in the game!",
                flags: MessageFlags.EPHEMERAL
            });
            if (game.currentPlayer !== config.clyde.id) return ctx.createFollowup({
                content: "It's not your turn!",
                flags: MessageFlags.EPHEMERAL
            });
            if (game.drawStackCounter) return ctx.createFollowup({
                content: "Choose an option",
                components: DrawStackedCardSelect(game, cardArrayToCount(game.cards[config.clyde.id]), true),
                flags: MessageFlags.EPHEMERAL
            });
            ctx.createFollowup({
                content: game.cards[config.clyde.id].map(c => cardEmotes[c]).join(" "),
                components: PickCardSelect(game, cardArrayToCount(game.cards[config.clyde.id]), true),
                flags: MessageFlags.EPHEMERAL
            });
            break;
        }
    }
}
