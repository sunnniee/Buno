import { EmbedBuilder } from "@oceanicjs/builders";
import { client, sendMessage } from "../client.js";
import { defaultColor } from "../constants.js";
import database from "../database.js";
import { Command } from "../types";

export const cmd = {
    name: "leaderboard",
    aliases: ["lb"],
    execute: (msg, args) => {
        const stats = database.getAllForGuild(/^\d{17,20}$/.test(args?.[0]) ? args[0] : msg.channel.guild.id);
        if (!stats) return;
        sendMessage(msg.channel.id, {
            embeds: [new EmbedBuilder()
                .setTitle(`Leaderboard for ${msg.channel.guild.name}`)
                .setColor(defaultColor)
                .setDescription(Object.entries(stats)
                    .sort(([_, a], [__, b]) => b.wins - a.wins || b.losses - a.losses)
                    .slice(0, 9)
                    .map(([id, stats]) =>
                        `**${client.users.get(id)?.username || id}** - **${stats.wins}** win${stats.wins === 1 ? "" : "s"}, \
${stats.losses ? `**${(stats.wins / stats.losses).toFixed(2)}** W/L` : "**No** losses"}`
                    ))
                .toJSON()
            ]
        });
    },
} as Command;
