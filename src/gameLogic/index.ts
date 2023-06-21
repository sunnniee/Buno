import { EmbedBuilder } from "@oceanicjs/builders";
import { AnyTextableGuildChannel, ComponentInteraction, ComponentTypes, Guild, Message, ModalSubmitInteraction, TypedCollection } from "oceanic.js";

import { client, deleteMessage, sendMessage } from "../client.js";
import { GameButtons, SettingsSelectMenu } from "../components.js";
import { ButtonIDs, cardEmojis, cardEmotes, coloredUniqueCards, defaultColor, defaultSettings, rainbowColors, SelectIDs, SettingsIDs, uniqueVariants, veryLongTime } from "../constants.js";
import database from "../database.js";
import { config } from "../index.js";
import timeouts from "../timeouts.js";
import { UnoGame } from "../types.js";
import { cancelGameMessageFail, getPlayerMember, getUsername, hasStarted, next, toHumanReadableTime, toTitleCase } from "../utils.js";
import { makeSettingsModal, onGameJoin, onSettingsChange } from "./notStarted.js";
import { onCardPlayed, onColorPlayed, onForceDrawPlayed } from "./playedCards.js";
import { leaveGame, onGameButtonPress } from "./started.js";

export const games: { [channelId: string]: UnoGame<boolean> } = new Proxy({}, {
    deleteProperty(t: { [channelId: string]: UnoGame<boolean> }, p: string) {
        timeouts.delete(t[p].channelID);
        delete t[p];
        return true;
    }
});

export function onTimeout(game: UnoGame<true>, player: string) {
    if (!games[game.channelID] || player !== game.currentPlayer || game.uid !== games[game.channelID].uid) return;
    const kickedPlayer = getPlayerMember(game, player);

    game.currentPlayer = next(game.players, game.players.indexOf(player));
    if (game.settings.kickOnTimeout) {
        game.players.splice(game.players.indexOf(player), 1);
        game.playersWhoLeft.push(player);
    }
    sendMessage(game.channelID,
        `**${kickedPlayer?.nick ?? kickedPlayer?.username}** was ${game.settings.kickOnTimeout ? "removed" : "skipped"} for inactivity`
    );
    if (game.players.length <= 1) {
        timeouts.delete(game.channelID);
        deleteMessage(game.message);
        return;
    }

    timeouts.set(game.channelID, () => onTimeout(game, game.currentPlayer), game.settings.timeoutDuration * 1000);
    sendGameMessage(game);
}

export function makeStartMessage(game: UnoGame<false>, guild?: Guild) {
    return new EmbedBuilder()
        .setTitle(config.title)
        .setDescription(`
**Game will start <t:${game.starting}:R>**
Current game host: ${getUsername(game.host, true, guild ?? game.message?.channel?.guild)}
\`\`\`
${game.players.map(p => getUsername(p, true, guild ?? game.message?.channel?.guild, "codeblock") ?? `Unknown [${p}]`).join("\n")}
\`\`\`
    `)
        .setColor(defaultColor)
        .toJSON();
}

const makeGameLine = (game: UnoGame<true>, playerID: string, i: number) =>
    `${game.players.indexOf(game.currentPlayer) === i ? "+ " : "\u200b  "}\
${getUsername(playerID, true, game.message.channel.guild, "codeblock") ?? `Unknown [${playerID}]`}: \
${game.cards[playerID].length} card${game.cards[playerID].length === 1 ? "" : "s"}`;

export function sendGameMessage(game: UnoGame<true>, keepTimeout = false) {
    const isUnique = uniqueVariants.includes(game.currentCard);
    const currentCardEmote = isUnique ? coloredUniqueCards[`${game.currentCardColor}-${game.currentCard}`] : cardEmotes[game.currentCard];

    games[game.channelID] = game;
    sendMessage(game.channelID, {
        content: `<@${game.currentPlayer}> it's now your turn`,
        allowedMentions: { users: true },
        embeds: [new EmbedBuilder()
            .setTitle(config.title)
            .setDescription(`
Currently playing: **${getUsername(game.currentPlayer, true, game.message?.channel?.guild) ?? `<@${game.currentPlayer}>`}**
Current card: ${config.emoteless && isUnique ? cardEmotes[game.currentCard] : currentCardEmote} \
${toTitleCase(game.currentCard ?? "this should not be here")} \
${uniqueVariants.includes(game.currentCard) ? ` (${game.currentCardColor})` : ""} \
${game.drawStackCounter ? `\n\nNext player must draw **${game.drawStackCounter} cards**` : ""}
\`\`\`diff
${game.players.map((p, i) => makeGameLine(game, p, i)).join("\n")}
\`\`\`
`.trim())
            .setThumbnail(`https://cdn.discordapp.com/emojis/${isUnique
                ? coloredUniqueCards[`${game.currentCardColor}-${game.currentCard}`].match(/<:\w+:(\d+)>/)[1]
                : cardEmojis[game.currentCard].match(/<:\w+:(\d+)>/)[1]}.png`)
            .setColor(rainbowColors[game.players.indexOf(game.currentPlayer) % 7] || defaultColor)
            .setFooter((game._modified ? "This game will not count towards the leaderboard. " : "")
                + `Timeout is ${toHumanReadableTime(game.settings.timeoutDuration).toLowerCase()}`)
            .toJSON()],
        components: GameButtons(game)
    }).then(msg => {
        if (!msg) return cancelGameMessageFail(game);

        if (game.message?.channel) deleteMessage(game.message);
        if (!keepTimeout) timeouts.set(game.channelID, () => onTimeout(game, game.currentPlayer), game.settings.timeoutDuration * 1000);

        game.message = msg;
        games[game.channelID] = game;
    });
}

export function onButtonPress(ctx: ComponentInteraction<ComponentTypes.BUTTON>) {
    ctx.deferUpdate();

    const game = games[ctx.channel.id];
    switch (ctx.data.customID.split("__")[0] as typeof ButtonIDs[keyof typeof ButtonIDs]) {
        case ButtonIDs.JOIN_GAME:
        case ButtonIDs.LEAVE_GAME_BEFORE_START:
        case ButtonIDs.START_GAME:
        case ButtonIDs.DELETE_GAME:
        case ButtonIDs.EDIT_GAME_SETTINGS:
            if (!game || hasStarted(game)) return;
            onGameJoin(ctx, game);
            break;
        case ButtonIDs.VIEW_CARDS:
        case ButtonIDs.PLAY_CARD:
        case ButtonIDs.LEAVE_GAME:
        case ButtonIDs.JOIN_MID_GAME:
        case ButtonIDs.VIEW_GAME_SETTINGS:
            if (!game || !hasStarted(game)) return;
            onGameButtonPress(ctx, game);
            break;
        case ButtonIDs.LEAVE_GAME_CONFIRMATION_YES:
            if (!game || !hasStarted(game)) return;
            leaveGame(ctx, game);
            break;
        case ButtonIDs.LEAVE_GAME_CONFIRMATION_NO:
            ctx.deleteOriginal();
            break;
    }
}

export function onSelectMenu(ctx: ComponentInteraction<ComponentTypes.STRING_SELECT>) {
    if (ctx.data.customID === SelectIDs.EDIT_GAME_SETTINGS) {
        if (ctx.data.values.raw[0] === SettingsIDs.TIMEOUT_DURATION) return makeSettingsModal(ctx);
    }
    ctx.deferUpdate();

    const game = games[ctx.channel.id];
    if (!game) return;

    if ((ctx.data.customID === SelectIDs.CHOOSE_CARD || ctx.data.customID === SelectIDs.CHOOSE_CARD_ABOVE_25)
        && hasStarted(game)
    )
        onCardPlayed(ctx, game);
    else if (ctx.data.customID === SelectIDs.CHOOSE_COLOR && hasStarted(game))
        onColorPlayed(ctx, game);
    else if (ctx.data.customID === SelectIDs.FORCEFUL_DRAW && hasStarted(game))
        onForceDrawPlayed(ctx, game);
    else if ((ctx.data.customID === SelectIDs.EDIT_GAME_SETTINGS || ctx.data.customID === SelectIDs.EDIT_GAME_SETTINGS_RULES)
        && !hasStarted(game)
    )
        onSettingsChange(ctx, game);
}

export function onModalSubmit(ctx: ModalSubmitInteraction) {
    ctx.deferUpdate();
    if (ctx.data.customID === SettingsIDs.TIMEOUT_DURATION_MODAL) {
        const game = games[ctx.channel.id];
        if (!game || hasStarted(game)) return;

        const [timeoutDurationRaw] = ctx.data.components.map(i => i.components[0].value);
        let timeoutDuration = parseInt(timeoutDurationRaw.replace(/[ .,_]/gm, ""), 10);

        if (Number.isNaN(timeoutDuration)) ({ timeoutDuration } = defaultSettings);
        if (timeoutDuration < 0 || timeoutDuration > 3600) timeoutDuration = veryLongTime; // :slight_smile:
        if (timeoutDuration < 20) timeoutDuration = 20;

        game.settings.timeoutDuration = timeoutDuration;
        database.set(ctx.guild.id, ctx.member.id, { preferredSettings: game.settings });

        games[ctx.channel.id] = game;
        ctx.editOriginal({
            components: SettingsSelectMenu(game)
        });
    }
}

export function handleGameResend(msg: Message<AnyTextableGuildChannel>) {
    if (msg.author.id === client.user.id) return;
    const game = games[msg.channel.id];
    if (!game || !hasStarted(game) || !game.settings.resendGameMessage) return;

    const scrolledWeight = (msg.channel.messages as TypedCollection<string, any, Message<AnyTextableGuildChannel>>)
        .filter(m => BigInt(m.id) > BigInt(game.message.id))
        .reduce((weight, msg2) => (msg2.content.length > 800 || !msg2.attachments.empty || msg2.embeds.length ? 2 : 1) + weight, 0);
    if (scrolledWeight > 20) sendGameMessage(game, true);
}
