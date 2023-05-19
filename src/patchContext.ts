import { AnyInteractionGateway } from "oceanic.js";

import { sendMessage } from "./client.js";
import { onMsgError } from "./utils.js";

function onInteractionError(e: Error, ctx: AnyInteractionGateway) {
    if (e.message.includes("Unknown Interaction")) {
        return sendMessage(ctx.channel.id, `<@${ctx.member.id}> Discord couldn't handle the request`);
    }
    else onMsgError(e, ctx);
}

export function patch<T extends AnyInteractionGateway>(ctx: T) {
    const methods = [
        "createFollowup", "createMessage", "createModal",
        "defer", "deferUpdate",
        "deleteFollowup", "deleteOriginal",
        "editOriginal", "editFollowup", "editParent",
        "getFollowup", "getOriginal",
    ] as const;
    methods.forEach(m => ctx[m] && (ctx[m] = new Proxy(ctx[m], {
        apply(target, thisArg, argArray) {
            return target.apply(thisArg, argArray).catch(e => onInteractionError(e, ctx));
        },
    })));
}
