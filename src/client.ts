import { config } from "dotenv"; config();
import { AnyTextableGuildChannel, Client, CreateMessageOptions, Message } from "oceanic.js";

import { onMsgError } from "./utils.js";

export const client = new Client({
    auth: `Bot ${process.env.TOKEN}`,
    gateway: {
        intents: ["GUILDS", "GUILD_MESSAGES", "MESSAGE_CONTENT"]
    },
    allowedMentions: { everyone: false, roles: false, users: false, repliedUser: false }
});

export const sendMessage = (channelID: string, content: CreateMessageOptions | string, tryAgain = true): Promise<void | Message<AnyTextableGuildChannel>> =>
    client.rest.channels
        .createMessage<AnyTextableGuildChannel>(channelID, typeof content === "string" ? { content } : content)
        .catch(e => tryAgain ? sendMessage(channelID, content, false) : onMsgError(e, { channelID }));

export const editMessage = (message: Message, content: CreateMessageOptions | string, tryAgain = true): Promise<void | Message<AnyTextableGuildChannel>> =>
    message && client.rest.channels
        .editMessage<AnyTextableGuildChannel>(message.channelID, message.id, typeof content === "string" ? { content } : content)
        .catch(e => tryAgain ? editMessage(message, content, false) : onMsgError(e, message));

export const deleteMessage = (message: Message, tryAgain = true) =>
    message && client.rest.channels
        .deleteMessage(message.channel.id, message.id)
        .catch(() => tryAgain && deleteMessage(message, false));

export const respond = (msg: Message, c: CreateMessageOptions | string) => {
    let content: CreateMessageOptions = { messageReference: { messageID: msg.id, channelID: msg.channel.id } };
    if (typeof c === "string") content.content = c;
    else content = { ...content, ...c };
    return sendMessage(msg.channelID, content);
};
