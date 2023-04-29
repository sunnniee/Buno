import { deleteMessage, sendMessage, client } from "../client.js";
import { AnyGuildTextChannel, ComponentInteraction, ComponentTypes, Message, ModalSubmitInteraction, TypedCollection } from "oceanic.js";
import { UnoGame } from "../types.js";
import { EmbedBuilder } from "@oceanicjs/builders";
import { makeSettingsModal, onGameJoin, onSettingsChange } from "./notStarted.js";
import { leaveGame, onGameButtonPress } from "./started.js";
import { cardEmotes, defaultColor, rainbowColors, SelectIDs, ButtonIDs, uniqueVariants, SettingsIDs, defaultSettings, coloredUniqueCards, veryLongTime, cardEmojis } from "../constants.js";
import { onCardPlayed, onColorPlayed, onForceDrawPlayed } from "./playedCards.js";
import { GameButtons, getUsername, SettingsSelectMenu, toHumanReadableTime, getPlayerMember, next, cancelGameMessageFail, hasStarted, toTitleCase } from "../utils.js";
import { onLeaderboardButtonPress } from "../commands/leaderboard.js";
import timeouts from "../timeouts.js";
import { config } from "../index.js";
import database from "../database.js";

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
    if (game.settings.kickOnTimeout) game.players.splice(game.players.indexOf(player), 1);
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

export function makeStartMessage(game: UnoGame<false>) {
    return new EmbedBuilder()
        .setTitle("The Buno.")
        .setDescription(`
**Game will start <t:${game.starting}:R>**
Current game host: ${getUsername(game.host, true, game.message?.channel?.guild)}
\`\`\`
${game.players.map(p => getUsername(p, true, game.message?.channel?.guild) ?? `Unknown [${p}]`).join("\n")}
\`\`\`
    `)
        .setColor(defaultColor)
        .toJSON();
}
const makeGameLine = (game: UnoGame<true>, playerID: string, i: number) =>
    `${game.players.indexOf(game.currentPlayer) === i ? "+ " : "  "}${getUsername(playerID, true, game.message.channel.guild) ?? `Unknown [${playerID}]`}: \
${game.cards[playerID].length} card${game.cards[playerID].length === 1 ? "" : "s"}`;
export function sendGameMessage(game: UnoGame<true>, keepTimeout = false) {
    const isUnique = uniqueVariants.includes(game.currentCard as any);
    const currentCardEmote = isUnique ? coloredUniqueCards[`${game.currentCardColor}-${game.currentCard}`] : cardEmotes[game.currentCard];
    sendMessage(game.channelID, {
        content: `<@${game.currentPlayer}> it's now your turn`,
        allowedMentions: { users: true },
        embeds: [new EmbedBuilder()
            .setTitle("The Buno.")
            .setDescription(`
Currently playing: **${getUsername(game.currentPlayer, true, game.message?.channel?.guild) ?? `<@${game.currentPlayer}>`}**
Current card: ${config.emoteless && isUnique ? cardEmotes[game.currentCard] : currentCardEmote} \
${toTitleCase(game.currentCard)} \
${uniqueVariants.includes(game.currentCard as typeof uniqueVariants[number]) ? ` (${game.currentCardColor})` : ""} \
${game.drawStackCounter ? `\nNext player must draw **${game.drawStackCounter}** cards` : ""}
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
        components: GameButtons(game.clyde)
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
        case ButtonIDs.CLYDE_GET_CARDS:
        case ButtonIDs.CLYDE_PLAY:
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
        case ButtonIDs.LEADERBOARD_LAST:
        case ButtonIDs.LEADERBOARD_NEXT:
            onLeaderboardButtonPress(ctx);
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
    if (ctx.data.customID === SelectIDs.CHOOSE_CARD && hasStarted(game)) onCardPlayed(ctx, game);
    else if (ctx.data.customID === SelectIDs.CHOOSE_COLOR && hasStarted(game)) onColorPlayed(ctx, game);
    else if (ctx.data.customID === SelectIDs.FORCEFUL_DRAW && hasStarted(game)) onForceDrawPlayed(ctx, game);
    else if (ctx.data.customID === SelectIDs.CLYDE_CHOOSE_CARD && hasStarted(game)) onCardPlayed(ctx, game, false, true);
    else if (ctx.data.customID === SelectIDs.CLYDE_CHOOSE_COLOR && hasStarted(game)) onColorPlayed(ctx, game, true);
    else if (ctx.data.customID === SelectIDs.CLYDE_FORCEFUL_DRAW && hasStarted(game)) onForceDrawPlayed(ctx, game, true);
    else if (ctx.data.customID === SelectIDs.EDIT_GAME_SETTINGS && !hasStarted(game)) onSettingsChange(ctx, game);
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

export function handleGameResend(msg: Message<AnyGuildTextChannel>) {
    if (msg.author.id === client.user.id) return;
    const game = games[msg.channel.id];
    if (!game || !hasStarted(game) || !game.settings.resendGameMessage) return;
    const scrolledWeight = (msg.channel.messages as TypedCollection<string, any, Message<AnyGuildTextChannel>>)
        .filter(m => BigInt(m.id) > BigInt(game.message.id))
        .reduce((weight, msg2) => (msg2.content.length > 800 || !msg2.attachments.empty || msg2.embeds.length ? 2 : 1) + weight, 0);
    if (scrolledWeight > 20) sendGameMessage(game, true);
}
