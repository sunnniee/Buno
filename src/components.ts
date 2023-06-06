import { ComponentBuilder } from "@oceanicjs/builders";
import { ButtonStyles, ComponentTypes, MessageActionRow } from "oceanic.js";

import { client, sendMessage } from "./client.js";
import { ButtonIDs, cardEmotes, defaultSettings, SelectIDs, SettingsIDs } from "./constants.js";
import { sendGameMessage } from "./gameLogic/index.js";
import { Card, UnoGame } from "./types.js";
import { cardArrayToCount, getUsername, next, toHumanReadableTime, toTitleCase } from "./utils.js";

export const GameButtons = ((canRejoin: boolean) => {
    const components = new ComponentBuilder<MessageActionRow>()
        .addInteractionButton({
            style: ButtonStyles.SECONDARY,
            customID: ButtonIDs.VIEW_CARDS,
            label: "View cards",
            emoji: ComponentBuilder.emojiToPartial("🔍", "default")
        })
        .addInteractionButton({
            style: ButtonStyles.SUCCESS,
            customID: ButtonIDs.PLAY_CARD,
            label: "Play",
            emoji: ComponentBuilder.emojiToPartial("🃏", "default")
        })
        .addRow()
        .addInteractionButton({
            style: ButtonStyles.SECONDARY,
            customID: ButtonIDs.VIEW_GAME_SETTINGS,
            emoji: ComponentBuilder.emojiToPartial("⚙", "default")
        })
        .addInteractionButton({
            style: ButtonStyles.DANGER,
            customID: ButtonIDs.LEAVE_GAME,
            emoji: ComponentBuilder.emojiToPartial("🚪", "default")
        })
        .addInteractionButton({
            style: ButtonStyles.PRIMARY,
            customID: ButtonIDs.JOIN_MID_GAME,
            label: "Join",
            disabled: !canRejoin,
            emoji: ComponentBuilder.emojiToPartial("➡️", "default")
        });
    return components.toJSON();
});

export function PickCardSelect(game: UnoGame<true>, id: string, canSkip = false): MessageActionRow[] | false {
    if (!game.players.includes(id))
        throw new Error(`Player ${id} not in game ${game.channelID}`);

    const cards = cardArrayToCount(game.cards[id]);
    const entries = [
        ...Object.keys(cards).map(c => {
            return {
                label: `${toTitleCase(c)}${cards[c] >= 2 ? ` x${cards[c]}` : ""}`,
                value: c,
                emoji: ComponentBuilder.emojiToPartial(cardEmotes[c])
            };
        }),
        {
            label: "Draw a card",
            value: "draw",
            emoji: ComponentBuilder.emojiToPartial("🃏")
        }
    ];

    if (game.settings.allowSkipping && canSkip)
        entries.push({
            label: "Skip your turn",
            value: "skip",
            emoji: ComponentBuilder.emojiToPartial("➡")
        });

    if (entries.length > 50) {
        game.players.splice(game.players.indexOf(id), 1);
        sendMessage(game.channelID, `Removed **${getUsername(id, true, client.guilds.get(game.guildID))}**`);
        if (game.players.length <= 1) return;
        if (game.currentPlayer === id) {
            game.currentPlayer = next(game.players, game.players.indexOf(game.currentPlayer));
            game.lastPlayer.duration = 0;
        }
        sendGameMessage(game);
        return false;
    }

    const row = new ComponentBuilder<MessageActionRow>();
    row.addSelectMenu({
        customID: SelectIDs.CHOOSE_CARD,
        placeholder: "Choose a card",
        type: ComponentTypes.STRING_SELECT,
        options: entries.slice(0, 25)
    });
    if (entries.length > 25) row.addSelectMenu({
        customID: SelectIDs.CHOOSE_CARD_ABOVE_25,
        placeholder: "Choose a card",
        type: ComponentTypes.STRING_SELECT,
        options: entries.slice(25)
    });

    return row.toJSON();
}

export const DrawStackedCardSelect = (game: UnoGame<true>, cards: { [k in Card]?: number }) => new ComponentBuilder<MessageActionRow>()
    .addSelectMenu({
        customID: SelectIDs.FORCEFUL_DRAW,
        options: [{
            label: `Draw ${game.drawStackCounter} cards`,
            value: "draw-forceful",
            emoji: ComponentBuilder.emojiToPartial("🃏")
        },
        ...Object.keys(cards).map(c => {
            if (c === "+4" || c.split("-")[1] === "+2") return {
                label: `${toTitleCase(c)}`,
                value: c,
                emoji: ComponentBuilder.emojiToPartial(cardEmotes[c], "custom")
            };
        })].filter(Boolean),
        type: ComponentTypes.STRING_SELECT
    })
    .toJSON();

export const SettingsSelectMenu = (game: UnoGame<false>) => new ComponentBuilder<MessageActionRow>()
    .addSelectMenu({
        customID: SelectIDs.EDIT_GAME_SETTINGS,
        type: ComponentTypes.STRING_SELECT,
        options: [{
            label: "Turn duration",
            value: SettingsIDs.TIMEOUT_DURATION,
            description: `${toHumanReadableTime(game.settings.timeoutDuration ?? defaultSettings.timeoutDuration)}`
        },
        {
            label: "Kick on timeout",
            value: SettingsIDs.KICK_ON_TIMEOUT,
            description: game.settings.kickOnTimeout ? "Enabled" : "Disabled"
        },
        {
            label: "Allow skipping turns",
            value: SettingsIDs.ALLOW_SKIPPING,
            description: game.settings.allowSkipping ? "Enabled" : "Disabled"
        },
        {
            label: "Anti sabotage",
            value: SettingsIDs.ANTI_SABOTAGE,
            description: `Don't allow drawing too many cards at once. ${game.settings.antiSabotage ? "Enabled" : "Disabled"}`
        },
        {
            label: "Stack +2's and +4's",
            value: SettingsIDs.ALLOW_CARD_STACKING,
            description: game.settings.allowStacking ? "Enabled" : "Disabled"
        },
        {
            label: "Randomize order of players",
            value: SettingsIDs.RANDOMIZE_PLAYER_LIST,
            description: game.settings.randomizePlayerList ? "Enabled" : "Disabled"
        },
        {
            label: "Resend game message",
            value: SettingsIDs.RESEND_GAME_MESSAGE,
            description: `if it gets sent too far up because of chat. ${game.settings.resendGameMessage ? "Enabled" : "Disabled"}`
        },
        {
            label: "Allow joining mid game",
            value: SettingsIDs.ALLOW_REJOINING,
            description: game.settings.canRejoin ? "Enabled" : "Disabled"
        }]
    })
    .toJSON();
