import { ComponentBuilder } from "@oceanicjs/builders";
import { MessageActionRow, ButtonStyles, AnyGuildTextChannel, ComponentTypes, Guild, Member } from "oceanic.js";
import { client } from "./client.js";
import { ButtonIDs, SelectIDs, cardEmotes, SettingsIDs, defaultSettings } from "./constants.js";
import { toTitleCase, wasLastTurnBlocked } from "./gameLogic/index.js";
import { config } from "./index.js";
import { UnoGame, Card } from "./types.js";



export const GameButtons = ((clyde = false) => {
    const components = new ComponentBuilder<MessageActionRow>()
        .addInteractionButton({
            style: ButtonStyles.SECONDARY,
            customID: ButtonIDs.VIEW_CARDS,
            label: "View",
            emoji: ComponentBuilder.emojiToPartial("🔍", "default")
        })
        .addInteractionButton({
            style: ButtonStyles.PRIMARY,
            customID: ButtonIDs.PLAY_CARD,
            label: "Play",
            emoji: ComponentBuilder.emojiToPartial("🃏", "default")
        })
        .addInteractionButton({
            style: ButtonStyles.DANGER,
            customID: ButtonIDs.LEAVE_GAME,
            emoji: ComponentBuilder.emojiToPartial("🚪", "default")
        });
    if (clyde) components.addRow()
        .addInteractionButton({
            style: ButtonStyles.SECONDARY,
            customID: ButtonIDs.CLYDE_GET_CARDS,
            label: "Get Clyde Cards",
            emoji: ComponentBuilder.emojiToPartial("🔍", "default")
        })
        .addInteractionButton({
            style: ButtonStyles.PRIMARY,
            customID: ButtonIDs.CLYDE_PLAY,
            label: "Play as Clyde",
            emoji: ComponentBuilder.emojiToPartial("🃏", "default")
        });
    return components.toJSON();
});

export function onMsgError(e, ctx: { channelID: string }) {
    console.log(e);
    return client.rest.channels.createMessage<AnyGuildTextChannel>(ctx.channelID, {
        content: `\`\`\`ts\n${e.toString().replace(/\/[\w]{25,}/gi, "/[REDACTED]")}\`\`\``
    }).catch(() => { });
}

export const PickCardSelect = (game: UnoGame<true>, cards: { [k in Card]?: number }, asClyde = false) => new ComponentBuilder<MessageActionRow>()
    .addSelectMenu({
        customID: asClyde ? SelectIDs.CLYDE_CHOOSE_CARD : SelectIDs.CHOOSE_CARD,
        placeholder: "Choose a card",
        options: [
            ...Object.keys(cards).map(c => {
                return {
                    label: `${toTitleCase(c)}${cards[c] >= 2 ? ` x${cards[c]}` : ""}`,
                    value: c,
                    emoji: ComponentBuilder.emojiToPartial(cardEmotes[c], "custom")
                };
            }),
            {
                label: "Draw a card",
                value: "draw",
                emoji: ComponentBuilder.emojiToPartial("🃏")
            }
        ].concat(game.lastPlayer.id === game.currentPlayer && game.settings.allowSkipping &&
            (game.players.length === 2 ? (wasLastTurnBlocked(game) ? game.lastPlayer.duration >= 1 : true) : true)
            ? [{
                label: "Skip your turn",
                value: "skip",
                emoji: ComponentBuilder.emojiToPartial("➡")
            }] : []),
        type: ComponentTypes.STRING_SELECT
    })
    .toJSON();
export const DrawStackedCardSelect = (game: UnoGame<true>, cards: { [k in Card]?: number }, asClyde = false) => new ComponentBuilder<MessageActionRow>()
    .addSelectMenu({
        customID: asClyde ? SelectIDs.CLYDE_FORCEFUL_DRAW : SelectIDs.FORCEFUL_DRAW,
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

export function toHumanReadableTime(n: number) {
    if (n < 0 || n > 3600) return "Disabled";
    if (n < 60) return `${n} seconds`;
    const m = Math.floor(n / 60), s = n % 60;
    return `${m} minute${m === 1 ? "" : "s"}${s ? ` and ${s} second${s === 1 ? "" : "s"}` : ""}`;
}
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
        }]
    })
    .toJSON();

export function getUsername(id: string, nick: boolean, guild: Guild, fetchedMembers?: Member[]) {
    if (id === config.clyde.id) return config.clyde.name;
    return (nick ? fetchedMembers?.find(m => m.id === id)?.nick : null)
        ?? (nick ? guild?.members.get(id)?.nick : null)
        ?? fetchedMembers?.find(m => m.id === id)?.username
        ?? guild?.members.get(id)?.username
        ?? client.users.get(id)?.username
        ?? id;
}
