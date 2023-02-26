import { config } from "dotenv"; config()
import { Client, CreateMessageOptions, Message } from "oceanic.js"

export const client = new Client({
    auth: `Bot ${process.env.TOKEN}`,
    gateway: {
        intents: ["GUILDS", "GUILD_MESSAGES", "MESSAGE_CONTENT"]
    },
    allowedMentions: { roles: false }
})

export const sendMessage = (channelId: string, content: CreateMessageOptions | string) =>
    client.rest.channels.createMessage(channelId, typeof content === "string" ? { content } : content)
export const editMessage = (message: Message, content: CreateMessageOptions | string): any =>
    client.rest.channels.editMessage(message.channelID, message.id, typeof content === "string" ? { content } : content)

export const deleteMessage = (message: Message) => client.rest.channels.deleteMessage(message.channel.id, message.id)
export const respond = (msg: Message, c: CreateMessageOptions | string) => {
    let content: CreateMessageOptions = { messageReference: { messageID: msg.id, channelID: msg.channel.id } }
    if (typeof c === "string") content.content = c
    else content = { ...content, ...c }
    return sendMessage(msg.channelID, content)
}
