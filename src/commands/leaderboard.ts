import { EmbedBuilder } from "@oceanicjs/builders";
import { Guild, Member } from "oceanic.js";
import { client, sendMessage, editMessage } from "../client.js";
import { defaultColor } from "../constants.js";
import database from "../database.js";
import { Command } from "../types.js";

const emotes = ["🥇", "🥈", "🥉", "4.", "5.", "6.", "7.", "8.", "9."];
function getUsername(id: string, fetchedMembers?: Member[], guild?: Guild) {
    return fetchedMembers?.find(m => m.id === id)?.username ?? guild?.members.get(id)?.username ?? client.users.get(id)?.username ?? id;
}

export const cmd = {
    name: "leaderboard",
    aliases: ["lb"],
    execute: (msg, args) => {
        const guild = /^\d{17,20}$/.test(args?.[0]) ? (client.guilds.get(args[0]) ?? msg.channel.guild) : msg.channel.guild;
        const stats = database.getAllForGuild(guild.id);
        if (!stats) return;
        const sortedLb = Object.entries(stats)
            .sort(([, a], [, b]) => b.wins - a.wins || a.losses - b.losses)
            .slice(0, 9);
        const lbEmbed = (fetchedMembers?: Member[]) => new EmbedBuilder()
            .setTitle(`Leaderboard for ${guild.name}`)
            .setColor(defaultColor)
            .setDescription(sortedLb
                .map(([id, stats], i) =>
                    `\`${emotes[i]}\` __${getUsername(id, fetchedMembers, guild)}__ - **${stats.wins}** win${stats.wins === 1 ? "" : "s"}, \
${stats.losses ? `**${(stats.wins / stats.losses).toFixed(2)}** W/L` : "**No** losses"}\
${i === 2 ? "\n" : ""}`
                ))
            .toJSON();
        const lbMsg = sendMessage(msg.channel.id, {
            embeds: [lbEmbed()]
        });
        const ids = sortedLb.map(i => i[0]),
            cachedMembers = guild.members.filter(m => ids.includes(m.id));
        if (cachedMembers.length !== sortedLb.length) {
            const missing = sortedLb.filter(([id]) => !cachedMembers.find(m => m.id === id)).map(i => i[0]);
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
