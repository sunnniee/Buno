import { ComponentBuilder } from "@oceanicjs/builders"
import { ButtonStyles, MessageActionRow } from "oceanic.js"
import { respond } from "../client.js"
import { Command } from "../types"

export const cmd = {
    name: "the-button",
    execute: (msg, args) => {
        respond(msg, {
            content: "do not the button",
            components: new ComponentBuilder<MessageActionRow>()
                .addInteractionButton({
                    label: "the button",
                    customID: "the-button",
                    style: ButtonStyles.DANGER
                })
                .toJSON()
        })
    },
} as Command
