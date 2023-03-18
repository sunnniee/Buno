import { EmbedBuilder } from "@oceanicjs/builders";
import { Guild, Member } from "oceanic.js";
import { client, sendMessage, editMessage } from "../client.js";
import { defaultColor } from "../constants.js";
import database from "../database.js";
import { Command } from "../types.js";

const emotes = ["🥇", "🥈", "🥉"];
export function getUsername(id: string, nick?: boolean, fetchedMembers?: Member[], guild?: Guild) {
    return (nick ? fetchedMembers?.find(m => m.id === id)?.nick : null)
        ?? (nick ? guild?.members.get(id)?.nick : null)
        ?? fetchedMembers?.find(m => m.id === id)?.username
        ?? guild?.members.get(id)?.username
        ?? client.users.get(id)?.username
        ?? id;
}

type ParsedArguments = { page: number, guildId?: string }
function getArgs(args: string[]): ParsedArguments {
    const res = {} as ParsedArguments;
    args.every(a => {
        if (/^\d{17,20}$/.test(a)) res.guildId ??= a;
        else if (/^\d+$/.test(a)) res.page ??= parseInt(a, 10);
    });
    res.page ??= 1;
    if (res.page < 1) res.page = 1;
    return res;
}

export const cmd = {
    name: "leaderboard",
    aliases: ["lb"],
    execute: (msg, args) => {
        // eslint-disable-next-line prefer-const
        let { page, guildId } = getArgs(args);
        const guild = client.guilds.get(guildId) ?? msg.channel.guild;
        const stats = database.getAllForGuild(guild.id);
        if (!stats) return;
        const sortedLb = Object.entries(stats)
            .sort(([, a], [, b]) => b.wins - a.wins || a.losses - b.losses);
        if (sortedLb.length < (page - 1) * 10) page = 1;
        const sortedLbSegment = sortedLb
            .slice((page - 1) * 10, (page - 1) * 10 + 9);
        const yourStats = sortedLb.find(i => i[0] === msg.author.id);
        const yourIndex = sortedLb.indexOf(yourStats);
        const off = (i: number) => i + (page - 1) * 10;
        const lbEmbed = (fetchedMembers?: Member[]) => new EmbedBuilder()
            .setTitle(`Leaderboard for ${guild.name}`)
            .setColor(defaultColor)
            .setDescription(sortedLbSegment
                .map(([id, stats], i) =>
                    `\`${emotes[off(i)] ?? `${off(i)}.`}\` __${getUsername(id, false, fetchedMembers, guild)}__ - **${stats.wins}** win${stats.wins === 1 ? "" : "s"}, \
${stats.losses ? `**${(stats.wins / stats.losses).toFixed(2)}** W/L` : "**No** losses"}\
${i === 2 ? "\n" : ""}`
                ))
            .addField("Your rank", yourStats ? `\`${emotes[yourIndex] ?? `${yourIndex}.`}\` __${getUsername(msg.author.id, false, fetchedMembers, guild)}__\
- **${yourStats[1].wins}** win${yourStats[1].wins === 1 ? "" : "s"}, \
${yourStats[1].losses ? `**${(yourStats[1].wins / yourStats[1].losses).toFixed(2)}** W/L` : "**No** losses"}`
                : `\`??.\` __${getUsername(msg.author.id, false, fetchedMembers, guild)}__  - No stats`)
            .setFooter(`Page ${page} of ${Math.ceil(sortedLb.length / 10)}`)
            .toJSON();
        const lbMsg = sendMessage(msg.channel.id, {
            embeds: [lbEmbed()]
        });
        const ids = sortedLbSegment.map(i => i[0]),
            cachedMembers = guild.members.filter(m => ids.includes(m.id));
        if (cachedMembers.length !== sortedLbSegment.length) {
            const missing = sortedLbSegment.filter(([id]) => !cachedMembers.find(m => m.id === id)).map(i => i[0]);
            guild.fetchMembers({ userIDs: missing }).then(async members => {
                const m = await lbMsg;
                if (!m) return;
                editMessage(m, {
                    embeds: [lbEmbed(members)]
                });
            });
        }
    },
} as Command;
