import { deleteMessage, respond } from "../client.js";
import { games, hasStarted, sendGameMessage, updateStats } from "../gameLogic/index.js";
import { Command } from "../types";
import { getUsername } from "./leaderboard.js";

export const cmd = {
    name: "fixgame",
    execute: (msg, args) => {
        const game = games[msg.channel.id];
        if (!game) return respond(msg, "There's no game in this channel");
        if (!hasStarted(game)) {
            msg.channel.getMessage(game.message.id)
                .then(() => respond(msg, `Couldn't find anything wrong.
https://discord.com/channels/${game.message.channel.guild.id}/${game.message.channel.id}/${game.message.id}`))
                .catch(e => {
                    if (e.message.includes("Unknown Message")) {
                        delete games[msg.channel.id];
                        respond(msg, "👍 Deleted the game in this channel");
                    } else console.log(e);
                });
        } else {
            if (game.players.length <= 1) {
                const possiblyTheWinner = /\d{17,20}/.test(game.currentPlayer) ? game.currentPlayer : game.lastPlayer.id;
                deleteMessage(game.message);
                clearTimeout(game.timeout);
                delete games[msg.channel.id];
                respond(msg, `👍 Deleted the game in this channel\nGames that ended in everyone leaving shouldn't count as a win
**${getUsername(possiblyTheWinner)}** would've "won"`);
            } else if (Object.values(game.cards).some(a => a.length === 0)) {
                const winner = Object.entries(game.cards).find(([, cards]) => cards.length === 0)[0];
                updateStats(game, winner);
                deleteMessage(game.message);
                clearTimeout(game.timeout);
                delete games[msg.channel.id];
                respond(msg, `👍 Deleted the game in this channel and gave **${getUsername(winner)}** the win`);
            } else {
                msg.channel.getMessage(game.message.id)
                    .then(() => respond(msg, `Couldn't find anything wrong.
https://discord.com/channels/${game.message.channel.guild.id}/${game.message.channel.id}/${game.message.id}`))
                    .catch(e => {
                        if (e.message.includes("Unknown Message")) sendGameMessage(game);
                        else console.log(e);
                    });
            }
        }
    },
} as Command;
