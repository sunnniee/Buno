import { EmbedBuilder } from "@oceanicjs/builders";
import { Guild } from "oceanic.js";

import { client, respond } from "../client.js";
import { defaultColor } from "../constants.js";
import database from "../database.js";
import { Command, PlayerStorage } from "../types.js";
import { getUsername, Queue, without } from "../utils.js";

interface Stats extends PlayerStorage {
    id: string
}

const emotes = ["🥇", "🥈", "🥉"];

type ParsedArguments = { page: number, guildId?: string }
function getArgs(args: string[]): ParsedArguments {
    const res = {} as ParsedArguments;
    args.forEach(a => {
        if (/^\d{17,20}$/.test(a)) res.guildId ??= a;
        else if (/^\d+$/.test(a)) res.page ??= parseInt(a, 10);
    });
    res.page ??= 1;
    if (res.page < 1) res.page = 1;
    return res;
}

const queue = new Queue();
const retryFetchAfter = 3_600_000;
const cannotBeFetchedTimestamp: { [id: string]: number } = new Proxy({}, {
    get(t, p) {
        return t[p] ?? 0;
    }
});

function makeLeaderboardEmbed(fullStats: Stats[], page: number, author: string, guild: Guild, markMissing: boolean) {
    const getText = (i: number) => emotes[i + page * 10] || `${i + page * 10 + 1}.`;
    const stats = fullStats.slice(page * 10, page * 10 + 9);
    const yourStats = fullStats.find(s => s.id === author);
    const yourStatsIndex = fullStats.indexOf(yourStats);

    return new EmbedBuilder()
        .setTitle(`Leaderboard for ${guild.name}`)
        .setColor(defaultColor)
        .setDescription(stats.map((s, i) => {
            const username = getUsername(s.id, false, guild);
            if (username === s.id && markMissing) cannotBeFetchedTimestamp[s.id] = Date.now();
            return `\`${getText(i)}\`: __${username}__ - **${s.wins}** wins, \
${s.losses ? `**${(s.wins / s.losses).toFixed(2)}** W/L` : "**No** losses"}`;
        }
        ).join("\n"))
        .addField("Your stats", yourStats
            ? `\`${emotes[yourStatsIndex] || `${yourStatsIndex + 1}.`}\`: ${getUsername(yourStats.id, false, guild)} - **${yourStats.wins}** wins, \
${yourStats.losses ? `**${(yourStats.wins / yourStats.losses).toFixed(2)}** W/L` : "**No** losses"}`
            : `\`??.\` ${getUsername(author, false, guild)} - No stats`)
        .setFooter(`Page ${page + 1} of ${Math.ceil(fullStats.length / 10)}`)
        .toJSON();
}

export const cmd = {
    name: "leaderboard",
    aliases: ["lb"],
    execute: (msg, args) => {
        const { page: _page, guildId } = getArgs(args);
        const guild = client.guilds.get(guildId) ?? msg.channel.guild;
        const stats: Stats[] = Object.entries(
            without(database.getAllForGuild(guild.id), "settingsVersion")
        ).map(([id, v]) => ({
            id,
            ...v
        })).sort((a, b) => b.wins - a.wins || a.losses - b.losses);

        const endPage = Math.ceil(stats.length / 10);
        const page = (_page <= endPage ? _page : 1) - 1;
        const statsSegment = stats.slice(page * 10, page * 10 + 9);

        respond(msg, {
            embeds: [makeLeaderboardEmbed(stats, page, msg.author.id, guild, false)],
        }).then(m => {
            if (!m) return;
            const missingMembers = statsSegment.filter(({ id }) => getUsername(id, false, guild) === id);

            if (missingMembers.length && missingMembers.every(m => cannotBeFetchedTimestamp[m.id] + retryFetchAfter < Date.now()))
                guild.fetchMembers({ userIDs: missingMembers.map(m => m.id) })
                    .then(members => {
                        if (members.length !== missingMembers.length) {
                            const stillMissingMembers = missingMembers.filter(({ id }) => !members.some(m => m.id === id));
                            if (stillMissingMembers.length >= 5) queue.push(
                                () => m.edit({
                                    content: "Fetching missing users, this will take a bit",
                                    allowedMentions: { repliedUser: false }
                                })
                            );

                            stillMissingMembers.forEach(({ id }) => {
                                if (cannotBeFetchedTimestamp[id] + retryFetchAfter < Date.now())
                                    queue.push(() => client.rest.users.get(id));
                            });
                        }
                        queue.push(
                            () => m.edit({
                                content: null,
                                embeds: [makeLeaderboardEmbed(stats, page, msg.author.id, guild, true)],
                                allowedMentions: { repliedUser: false }
                            })
                        );
                    });
        });
    },
} as Command;
