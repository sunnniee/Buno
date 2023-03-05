import { AnyInteractionGateway } from "oceanic.js"
import { onMsgError } from "./constants.js"

export function patch<T = AnyInteractionGateway>(ctx: T): T {
    const methods = [
        "createFollowup", "createMessage", "createModal",
        "defer", "deferUpdate",
        "deleteFollowup", "deleteOriginal",
        "editOriginal", "editFollowup", "editParent",
        "getFollowup", "getOriginal",
    ] as const
    methods.forEach(m => ctx[m] && (ctx[m] = new Proxy(ctx[m], {
        apply(target, thisArg, argArray) {
            return target.apply(thisArg, argArray).catch(e => onMsgError(e, ctx as any))
        },
    })))
    return ctx
}
