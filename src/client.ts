import { config } from "dotenv"; config()
import { AnyGuildTextChannel, Client, CreateMessageOptions, Message } from "oceanic.js"
import { onMsgError } from "./constants.js"

export const client = new Client({
    auth: `Bot ${process.env.TOKEN}`,
    gateway: {
        intents: ["GUILDS", "GUILD_MESSAGES", "MESSAGE_CONTENT"]
    },
    allowedMentions: { roles: false }
})

export const sendMessage = (channelID: string, content: CreateMessageOptions | string) =>
    client.rest.channels.createMessage<AnyGuildTextChannel>(channelID, typeof content === "string" ? { content } : content)
        .catch(e => onMsgError(e, { channelID }))
export const editMessage = (message: Message, content: CreateMessageOptions | string): any =>
    client.rest.channels.editMessage<AnyGuildTextChannel>(message.channelID, message.id, typeof content === "string" ? { content } : content)
        .catch(e => onMsgError(e, message))

export const deleteMessage = (message: Message) => client.rest.channels.deleteMessage(message.channel.id, message.id).catch()
export const respond = (msg: Message, c: CreateMessageOptions | string) => {
    let content: CreateMessageOptions = { messageReference: { messageID: msg.id, channelID: msg.channel.id } }
    if (typeof c === "string") content.content = c
    else content = { ...content, ...c }
    return sendMessage(msg.channelID, content)
}
