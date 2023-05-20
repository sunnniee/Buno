import { ComponentBuilder } from "@oceanicjs/builders";
import { AnyGuildTextChannel, ButtonStyles, ComponentTypes, Guild, MessageActionRow } from "oceanic.js";

import { client } from "./client.js";
import { ButtonIDs, cardEmotes, cards, defaultSettings, SelectIDs, SettingsIDs } from "./constants.js";
import database from "./database.js";
import { games } from "./gameLogic/index.js";
import { Card, PlayerStorage, UnoGame } from "./types.js";

export const GameButtons = (() => {
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
        })
        .addInteractionButton({
            style: ButtonStyles.SECONDARY,
            customID: ButtonIDs.VIEW_GAME_SETTINGS,
            emoji: ComponentBuilder.emojiToPartial("⚙", "default")
        });
    return components.toJSON();
});

export function onMsgError(e: Error, ctx: { channelID: string }) {
    client.rest.channels.createMessage<AnyGuildTextChannel>(ctx.channelID, {
        content: `\`\`\`ts\n${e.toString().replace(/\/[\w]{25,}/gi, "/[REDACTED]")}\`\`\``
    }).catch(() => { });
    if (e.message.includes("Unknown ")) return;
    console.log(e);
}

export const PickCardSelect = (game: UnoGame<true>, cards: { [k in Card]?: number }) =>
    new ComponentBuilder<MessageActionRow>()
        .addSelectMenu({
            customID: SelectIDs.CHOOSE_CARD,
            placeholder: "Choose a card",
            options: [
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
            ].concat(game.lastPlayer.id === game.currentPlayer && game.settings.allowSkipping &&
                (game.players.length === 2 ? (wasLastTurnBlocked(game) ? game.lastPlayer.duration >= 1 : true) : true)
                ? [{
                    label: "Skip your turn",
                    value: "skip",
                    emoji: ComponentBuilder.emojiToPartial("➡")
                }]
                : []),
            type: ComponentTypes.STRING_SELECT
        })
        .toJSON();

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
        }]
    })
    .toJSON();

export function hasStarted(game: UnoGame<boolean>): game is UnoGame<true> {
    return game.started;
}
export function shuffle<T>(array: T[]): T[] {
    return array
        .map(c => ({ c, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ c }) => c);
}
export function next<T>(array: T[], n: number) {
    if (n < array.length - 1) return array[n + 1];
    else return array[0];
}
export function without<T extends Record<string, any>, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
    const obj2 = { ...obj };
    keys.forEach(k => { delete obj2[k]; });
    return obj2;
}

export class Queue {
    private promise = new Promise<void>(res => res());

    push(item: () => Promise<any>) {
        this.promise = this.promise.then(() => item());
    }
}

export const toTitleCase = (n: string) =>
    n.split("-").map(w => `${w[0].toUpperCase()}${w.slice(1).toLowerCase()}`).join(" ");

export const wasLastTurnBlocked = (game: UnoGame<true>) =>
    game.currentCard === "+4" || ["+2", "block"].includes(game.currentCard.split("-")[1]);

export const cardArrayToCount = (a: Card[]) => a
    .sort((a, b) => cards.indexOf(a) - cards.indexOf(b))
    .reduce((obj, c) => {
        obj[c] = (obj[c] + 1) || 1; return obj;
    }, {} as { [k in Card]: number; });

export const getPlayerMember = (game: UnoGame<boolean>, player: string) => game.message.channel.guild.members.get(player);

export function cancelGameMessageFail(game: UnoGame<boolean>) {
    getPlayerMember(game, game.host).user.createDM()
        .then(ch => ch.createMessage({ content: "Cancelling game as the bot is unable to send messages" }))
        .catch(() => { });
    delete games[game.channelID];
}

export function updateStats(game: UnoGame<true>, winner: string) {
    if (game._modified) return;
    const newStats: { [id: string]: PlayerStorage; } = {};
    game.players.forEach(id => {
        const val: PlayerStorage = database.get(game.guildID, id) ?? database.defaultValue;
        if (id === winner) val.wins++;
        else val.losses++;
        newStats[id] = val;
    });
    database.setBulk(game.guildID, newStats);
}

export function getUsername(id: string, nick: boolean, guild: Guild, inCodeblock = false) {
    const name = (nick && guild?.members.get(id)?.nick)
        || guild?.members.get(id)?.username
        || client.users.get(id)?.username
        || id;
    if (!name) return "[this shouldn't be here]";
    if (inCodeblock) return name.replace(/`/g, "`\u200b");
    return name.replace(/([*_~`|])/g, "\\$1");
}
