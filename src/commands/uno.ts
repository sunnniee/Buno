import { respond } from "../client.js";
import { Command, UnoGame } from "../types";
import { ComponentBuilder } from "@oceanicjs/builders";
import { ButtonStyles, MessageActionRow } from "oceanic.js";
import { games, makeStartMessage } from "../gameLogic/index.js";
import { ButtonIDs, defaultSettings } from "../constants.js";
import { startGame } from "../gameLogic/notStarted.js";
import { hasStarted } from "../utils.js";

export const cmd = {
    name: "uno",
    aliases: ["buno"],
    execute: (msg, args) => {
        const startTimeout = 305;
        const existingGame = games[msg.channel.id];
        if (existingGame) return respond(msg, `Someone already started a game
Jump: https://discord.com/channels/${existingGame.message.channel.guild.id}/${existingGame.message.channel.id}/${existingGame.message.id}`);
        const gameObj = {
            started: false,
            starting: Math.floor(Date.now() / 1000) + startTimeout,
            host: msg.author.id,
            settings: { ...defaultSettings },
            players: [msg.author.id],
            _allowSolo: args[0]?.toLowerCase() === "solo",
            _modified: false,
            channelID: msg.channel.id,
            guildID: msg.channel.guild.id
        } as UnoGame<false>;
        respond(msg, {
            embeds: [makeStartMessage(gameObj)],
            components: new ComponentBuilder<MessageActionRow>()
                .addInteractionButton({
                    style: ButtonStyles.PRIMARY,
                    customID: ButtonIDs.JOIN_GAME,
                    label: "Join",
                })
                .addInteractionButton({
                    style: ButtonStyles.DANGER,
                    customID: ButtonIDs.LEAVE_GAME_BEFORE_START,
                    emoji: ComponentBuilder.emojiToPartial("🚪", "default")
                })
                .addInteractionButton({
                    style: ButtonStyles.PRIMARY,
                    customID: ButtonIDs.START_GAME,
                    emoji: ComponentBuilder.emojiToPartial("▶", "default")
                })
                .addRow()
                .addInteractionButton({
                    style: ButtonStyles.DANGER,
                    customID: ButtonIDs.DELETE_GAME,
                    label: "Stop game",
                    emoji: ComponentBuilder.emojiToPartial("🛑", "default")
                })
                .addInteractionButton({
                    style: ButtonStyles.SECONDARY,
                    customID: ButtonIDs.EDIT_GAME_SETTINGS,
                    label: "Settings",
                    emoji: ComponentBuilder.emojiToPartial("⚙", "default")
                })
                .toJSON()
        }).then(m => {
            if (!m) return msg.createReaction("‼");
            gameObj.message = m;
            gameObj.startingTimeout = setTimeout(() => {
                const g = games[msg.channel.id];
                if (!hasStarted(g)) startGame(g);
            }, startTimeout * 1000);
            games[msg.channel.id] = gameObj;
        });
    },
} as Command;
