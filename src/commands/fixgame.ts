import { ChannelTypes } from "oceanic.js";
import { inspect } from "util";

import { client, deleteMessage, respond } from "../client.js";
import { games, sendGameMessage } from "../gameLogic/index.js";
import { config } from "../index.js";
import timeouts from "../timeouts.js";
import { Command, UnoGame } from "../types";
import { cardArrayToCount, getUsername, hasStarted, next, updateStats, without } from "../utils.js";

function sendDebugLog(game: UnoGame<true>, reason: "player left" | "card was played") {
    const debugChannel = client.getChannel(config.logChannel);
    if (!debugChannel || debugChannel.type !== ChannelTypes.GUILD_TEXT) return;

    debugChannel.createMessage({
        content: `Debug log from <t:${Math.floor(Date.now() / 1000)}> (<t:${Math.floor(Date.now() / 1000)}:R>)
Reason: ${reason}
${config.developerIds.map(id => `<@${id}>`).join(" ")}`,
        allowedMentions: { users: true },
        attachments: [{
            id: "0",
            filename: "game.json"
        }],
        files: [{
            name: "game.json",
            contents: Buffer.from(inspect(without(game, "message"), { depth: Infinity }))
        }]
    });
}

export const cmd = {
    name: "fixgame",
    execute: (msg, args) => {
        const game = games[msg.channel.id];
        if (!game) return respond(msg, "There's no game in this channel");
        const guild = game.message?.channel?.guild;

        if (!hasStarted(game)) {
            msg.channel.getMessage(game.message.id)
                .then(() => respond(msg, "Couldn't find anything wrong."))
                .catch(e => {
                    if (e.message.includes("Unknown Message")) {
                        delete games[msg.channel.id];
                        respond(msg, "👍 Deleted the game in this channel");
                    } else console.log(e);
                });
        } else {
            if (game.players.length <= 1) {
                sendDebugLog({ ...game }, "player left");
                const possiblyTheWinner = /\d{17,20}/.test(game.currentPlayer) ? game.currentPlayer : game.lastPlayer.id;
                deleteMessage(game.message);
                timeouts.delete(game.channelID);
                delete games[msg.channel.id];
                respond(msg, `👍 Deleted the game in this channel\nGames that ended in everyone leaving shouldn't count as a win
**${getUsername(possiblyTheWinner, true, guild)}** would've "won"`);
            }
            else if (Object.values(game.cards).some(a => a.length === 0)) {
                sendDebugLog({ ...game }, "card was played");
                const winner = Object.entries(game.cards).find(([, cards]) => cards.length === 0)[0];
                updateStats(game, winner);
                deleteMessage(game.message);
                timeouts.delete(game.channelID);
                delete games[msg.channel.id];
                respond(msg, `👍 Deleted the game in this channel and gave **${getUsername(winner, true, guild)}** the win`);
            }
            else if (Object.values(game.cards).some(c => Object.keys(cardArrayToCount(c)).length > 23)) {
                const badPlayer = Object.entries(game.cards).find(c => Object.keys(cardArrayToCount(c[1])).length > 23)![0];
                game.players.splice(game.players.indexOf(badPlayer), 1);
                respond(msg, `Removed **${getUsername(badPlayer, true, msg.guild)}**`);
                if (game.players.length <= 1) return;
                if (game.currentPlayer === badPlayer) {
                    game.currentPlayer = next(game.players, game.players.indexOf(game.currentPlayer));
                    game.lastPlayer.duration = 0;
                }
                return sendGameMessage(game);
            }
            else {
                msg.channel.getMessage(game.message.id)
                    .then(() => respond(msg, "Couldn't find anything wrong."))
                    .catch(e => {
                        if (e.message.includes("Unknown Message")) sendGameMessage(game);
                        else console.log(e);
                    });
            }
        }
    },
} as Command;
