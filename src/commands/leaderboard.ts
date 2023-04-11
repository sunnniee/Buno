import { ComponentBuilder, EmbedBuilder } from "@oceanicjs/builders";
import { ButtonStyles, ComponentInteraction, ComponentTypes, Guild, MessageActionRow } from "oceanic.js";
import { client, respond } from "../client.js";
import database from "../database.js";
import { Command, PlayerStorage } from "../types.js";
import { getUsername } from "../utils.js";
import { defaultColor, ButtonIDs } from "../constants.js";

interface Stats extends PlayerStorage {
    id: string
}

const emotes = ["🥇", "🥈", "🥉"];
const makeButtons = (lastDisabled: boolean, nextDisabled: boolean, guildId: string) =>
    new ComponentBuilder<MessageActionRow>()
        .addInteractionButton({
            customID: `${ButtonIDs.LEADERBOARD_LAST}__${guildId}`,
            style: ButtonStyles.PRIMARY,
            emoji: ComponentBuilder.emojiToPartial("◀", "default"),
            disabled: lastDisabled
        })
        .addInteractionButton({
            customID: `${ButtonIDs.LEADERBOARD_NEXT}__${guildId}`,
            style: ButtonStyles.PRIMARY,
            emoji: ComponentBuilder.emojiToPartial("▶", "default"),
            disabled: nextDisabled
        })
        .toJSON();

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

function makeLeaderboardEmbed(fullStats: Stats[], page: number, author: string, guild: Guild) {
    const getText = (i: number) => emotes[i + page * 10] || `${i + page * 10 + 1}.`;
    const stats = fullStats.slice(page * 10, page * 10 + 9);
    const yourStats = fullStats.find(s => s.id === author);
    const yourStatsIndex = fullStats.indexOf(yourStats);
    return new EmbedBuilder()
        .setTitle(`Leaderboard for ${guild.name}`)
        .setColor(defaultColor)
        .setDescription(stats.map((s, i) => `\`${getText(i)}\`: __${getUsername(s.id, false, guild)}__ - **${s.wins}** wins, \
${s.losses ? `**${(s.wins / s.losses).toFixed(2)}** W/L` : "**No** losses"}`
        ).join("\n"))
        .addField("Your stats", yourStats
            ? `\`${emotes[yourStatsIndex] || `${yourStatsIndex + 1}.`}\`: ${getUsername(yourStats.id, false, guild)} - **${yourStats.wins}** wins, \
${yourStats.losses ? `**${(yourStats.wins / yourStats.losses).toFixed(2)}** W/L` : "**No** losses"}`
            : `\`??.\` ${getUsername(author, false, guild)} - No stats`)
        .setFooter(`Page ${page + 1} of ${Math.ceil(fullStats.length / 10)}`)
        .toJSON();
}

export function onLeaderboardButtonPress(ctx: ComponentInteraction<ComponentTypes.BUTTON>) {
    const [interactionId, guildId] = ctx.data.customID.split("__");
    const direction = interactionId === ButtonIDs.LEADERBOARD_LAST ? -2 : 0; // trolley
    const page = parseInt(ctx.message.embeds[0]?.footer?.text?.match(/Page (\d+) of/)?.[1], 10) || 1;

    const guild = client.guilds.get(guildId);
    const stats: Stats[] = Object.entries(database.getAllForGuild(guild.id)).map(([id, v]) => ({
        id,
        ...v
    })).sort((a, b) => b.wins - a.wins || a.losses - b.losses);
    const endPage = Math.ceil(stats.length / 10);
    const statsSegment = stats.slice(page * 10, page * 10 + 9);

    ctx.editOriginal({
        embeds: [makeLeaderboardEmbed(stats, page + direction, ctx.member.id, guild)],
        components: makeButtons(page === 0, page === endPage - 1, guild.id)
    }).then(m => {
        if (!m) return;
        const missingMembers = statsSegment.filter(({ id }) => getUsername(id, false, guild) === id);
        if (missingMembers.length) guild.fetchMembers({ userIDs: missingMembers.map(m => m.id) })
            .then(() => m.edit({
                embeds: [makeLeaderboardEmbed(stats, page + direction, ctx.member.id, guild)]
            }));
    });
}

export const cmd = {
    name: "leaderboard",
    aliases: ["lb"],
    execute: (msg, args) => {
        const { page: _page, guildId } = getArgs(args);
        const guild = client.guilds.get(guildId) ?? msg.channel.guild;
        const stats: Stats[] = Object.entries(database.getAllForGuild(guild.id)).map(([id, v]) => ({
            id,
            ...v
        })).sort((a, b) => b.wins - a.wins || a.losses - b.losses);
        const endPage = Math.ceil(stats.length / 10);
        const page = (_page <= endPage ? _page : 1) - 1;
        const statsSegment = stats.slice(page * 10, page * 10 + 9);

        respond(msg, {
            embeds: [makeLeaderboardEmbed(stats, page, msg.author.id, guild)],
            components: makeButtons(page === 0, page === endPage - 1, guild.id)
        }).then(m => {
            if (!m) return;
            const missingMembers = statsSegment.filter(({ id }) => getUsername(id, false, guild) === id);
            if (missingMembers.length) guild.fetchMembers({ userIDs: missingMembers.map(m => m.id) })
                .then(() => m.edit({
                    embeds: [makeLeaderboardEmbed(stats, page, msg.author.id, guild)]
                }));
        });
    },
} as Command;
