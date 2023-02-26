import { Command } from "../types"
import { inspect } from "util"
import { respond } from "../client.js"

const DEV_IDS = ["406028027768733696"]
const MAX_RESPONSE_LENGTH = 1950

export const cmd = {
    name: "eval",
    execute: (msg, args) => {
        if (!DEV_IDS.includes(msg.author.id)) return
        const code = args.join(" ")
        const reportError = (e: Error): void => {
            respond(msg, `Error\n\`\`\`ts\n${e}\`\`\``)
            console.log(e)
        }
        msg.createReaction("👍")
        try {
            (eval(`(async function(){${code}})().catch(reportError)`) as Promise<any>).then(evalResult => {
                let result = inspect(evalResult, { depth: 5 })
                if (result.length > MAX_RESPONSE_LENGTH)
                    for (let i = 4; i > 0; i--) {
                        if (result.length > MAX_RESPONSE_LENGTH) result = inspect(evalResult, { depth: i })
                    }
                if (result.length > MAX_RESPONSE_LENGTH) {
                    result = "Too long, sending to console"
                    console.log(inspect(evalResult, { depth: 4, colors: true }))
                }
                if (result !== "undefined") respond(msg, "```ts\n" + result + "```")
            }).catch(reportError)
        } catch (e) { reportError(e) }
    },
} as Command
