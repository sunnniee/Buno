/* eslint-disable unused-imports/no-unused-imports */
import { Command } from "../types";
import { inspect } from "util";
import { client } from "../client.js";
import * as clientUtils from "../client.js";
import * as constants from "../constants.js";
import { games } from "../gameLogic/index.js";
import * as gameLogic from "../gameLogic/index.js";
import database from "../database.js";
client; gameLogic; database;

const MAX_RESPONSE_LENGTH = 1950;

export const cmd = {
    name: "eval",
    execute: (msg, args) => {
        if (!constants.devs.includes(msg.author.id)) return;
        const code = args.join(" ");
        const reportError = (e: Error): void => {
            clientUtils.respond(msg, `Error\n\`\`\`ts\n${e}\`\`\``);
        };
        msg.createReaction("👍").catch(() => { });
        try {
            let game;
            if (games[msg.channel.id]) {
                game = new Proxy(games[msg.channel.id], {
                    set(target, p, newValue, receiver) {
                        target._modified = true;
                        target[p] = newValue;
                        return true;
                    }
                });
                if (gameLogic.hasStarted(game)) game.draw = new Proxy(game.draw, {
                    apply(target, thisArg, argArray) {
                        games[msg.channel.id]._modified = true;
                        target.apply(thisArg, argArray);
                    },
                });
            }
            game;
            (eval(`(async function(){${code}})().catch(reportError)`) as Promise<any>).then(evalResult => {
                let result = inspect(evalResult, { depth: 5 });
                if (result.length > MAX_RESPONSE_LENGTH)
                    for (let i = 4; i > 0; i--) {
                        if (result.length > MAX_RESPONSE_LENGTH) result = inspect(evalResult, { depth: i });
                    }
                if (result.length > MAX_RESPONSE_LENGTH) {
                    return clientUtils.respond(msg, {
                        attachments: [{
                            id: "0",
                            filename: "output.ts"
                        }],
                        files: [{
                            name: "output.ts",
                            contents: Buffer.from(inspect(evalResult, { depth: 4 }))
                        }]
                    });
                }
                if (result !== "undefined") clientUtils.respond(msg, "```ts\n" + result + "```");
            }).catch(reportError);
        } catch (e) { reportError(e); }
    },
} as Command;
