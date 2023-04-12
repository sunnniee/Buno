import { Permissions } from "oceanic.js";
import { deleteMessage, respond } from "../client.js";
import { games } from "../gameLogic/index.js";
import timeouts from "../timeouts.js";
import { Command } from "../types";

export const cmd = {
    name: "cancel",
    aliases: ["delete", "stop"],
    execute: (msg, args) => {
        const game = games[msg.channel.id];
        if (!game) return respond(msg, "There's no game in this channel");
        const manageChannel = msg.member.permissions.has(Permissions.MANAGE_CHANNELS)
            || msg.channel.permissionsOf(msg.member.id).has(Permissions.MANAGE_CHANNELS);
        const manageServer = msg.member.permissions.has(Permissions.MANAGE_GUILD);
        if (!manageChannel) return respond(msg, "You need the `Manage Channels` permission to delete games");
        if (!game.started) {
            timeouts.delete(msg.channel.id);
            deleteMessage(game.message);
            delete games[msg.channel.id];
            return respond(msg, `👍 - <@${msg.author.id}> deleted the game in this channel`);
        } else {
            if (!manageServer) return respond(msg, "You need the `Manage Server` permission to delete ongoing games");
            timeouts.delete(msg.channel.id);
            deleteMessage(game.message);
            delete games[msg.channel.id];
            return respond(msg, `👍 - <@${msg.author.id}> deleted the game in this channel`);
        }
    },
} as Command;
