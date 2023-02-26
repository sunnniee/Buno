import { sendMessage } from "../client.js"
import { Command } from "../types"

export const cmd = {
    name: "test",
    execute: (msg, args) => {
        sendMessage(msg.channelID, {
            content: "it's alive!!"
        })
    },
} as Command
