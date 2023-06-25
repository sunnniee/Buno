import { AnyTextableGuildChannel, Guild } from "oceanic.js";

import { client } from "./client.js";
import { cards } from "./constants.js";
import database from "./database.js";
import { games } from "./gameLogic/index.js";
import { Card, PlayerStorage, UnoGame } from "./types.js";

export function onMsgError(e: Error, ctx: { channelID: string }) {
    client.rest.channels.createMessage<AnyTextableGuildChannel>(ctx.channelID, {
        content: `\`\`\`ts\n${e.toString().replace(/\/[\w]{25,}/gi, "/[REDACTED]")}\`\`\``
    }).catch(() => { });
    if (e.message.includes("Unknown ")) return;
    console.log(e);
}

export function toHumanReadableTime(n: number) {
    if (n < 0 || n > 3600) return "Disabled";
    if (n < 60) return `${n} seconds`;
    const m = Math.floor(n / 60), s = n % 60;
    return `${m} minute${m === 1 ? "" : "s"}${s ? ` and ${s} second${s === 1 ? "" : "s"}` : ""}`;
}

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
    game.currentCard === "+4"
    || ["+2", "block"].includes(game.currentCard.split("-")[1])
    || (game.players.length <= 2 && game.currentCard.split("-")[1] === "reverse");

export const cardArrayToCount = (a: Card[]) => a
    .sort((a, b) => cards.indexOf(a) - cards.indexOf(b))
    .reduce((obj, c) => {
        obj[c] = (obj[c] + 1) || 1; return obj;
    }, {} as { [k in Card]?: number; });

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
        const val = database.getOrCreate(game.guildID, id);
        if (id === winner) val.wins++;
        else val.losses++;
        newStats[id] = val;
    });
    database.setBulk(game.guildID, newStats);
}

export function getUsername(id: string, nick: boolean, guild: Guild, charEscape: "none" | "markdown" | "codeblock" = "markdown") {
    const name = (nick && guild?.members.get(id)?.nick)
        || guild?.members.get(id)?.user.globalName
        || client.users.get(id)?.globalName
        || guild?.members.get(id)?.username
        || client.users.get(id)?.username
        || id;
    if (!name) return "[this shouldn't be here]";

    if (charEscape === "none") return name;
    else if (charEscape === "codeblock") return name.replace(/`/g, "`\u200b");
    return name.replace(/([*_~`|])/g, "\\$1");
}
