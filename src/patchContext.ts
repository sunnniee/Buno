import { AnyInteractionGateway } from "oceanic.js";
import { sendMessage } from "./client.js";
import { onMsgError } from "./utils.js";

function onInteractionError(e: Error, ctx: AnyInteractionGateway) {
    if (e.message.includes("Unknown ")) {
        console.log(e);
        return sendMessage(ctx.channel.id, `<@${ctx.member.id}> Unknown interaction, please try again`);
    }
    else onMsgError(e, ctx);
}

export function patch<T extends AnyInteractionGateway>(ctx: T): T {
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
    return ctx;
}
