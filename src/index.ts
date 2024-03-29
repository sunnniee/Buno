import { readdir, readFileSync } from "fs";
import { ActivityTypes, InteractionTypes } from "oceanic.js";
import { parse } from "toml";

import { client } from "./client.js";
import { defaultConfig } from "./constants.js";
import { handleGameResend, onButtonPress, onModalSubmit, onSelectMenu } from "./gameLogic/index.js";
import { patch } from "./patchContext.js";
import { Command, Config } from "./types.js";
import { onMsgError } from "./utils.js";

declare global {
    interface Array<T> {
        includes<U>(searchElement: U, fromIndex?: number): U extends T ? boolean : false;
    }
    interface ReadonlyArray<T> {
        includes<U>(searchElement: U, fromIndex?: number): U extends T ? boolean : false;
    }
}

export let config: Config;
let configFile: Partial<Config>;
try {
    configFile = parse(readFileSync("config.toml", "utf-8"));
    config = { ...defaultConfig, ...configFile };
} catch (e) {
    config = defaultConfig;
}

const prefix = process.argv[2] === "--dev" ? config.devPrefix : config.prefix;

const commands: { [k: string]: Command } = {};
// why the fuck does it need ./src specified
readdir("./src/commands", (err, res) => {
    if (err) throw err;
    res.forEach(
        f => (import(`./commands/${f.slice(0, -3)}.js`) as Promise<{ cmd: Command }>)
            .then(c => {
                if (commands[c.cmd.name]) return console.error(`Duplicate command ${c.cmd.name}`);

                c.cmd.aliases?.forEach(a => {
                    if (commands[a]) return console.error(`Duplicate command ${a}`);
                    else commands[a] = c.cmd;
                });

                commands[c.cmd.name] = c.cmd;
            })
    );
});

client.once("ready", () => {
    console.log("Ready as", client.user.tag);

    if (config.status) client.editStatus("online", [{ name: `${config.status} - ${prefix}uno`, type: ActivityTypes.GAME }]);
    if (config.logChannel) client.rest.channels.createMessage(config.logChannel, {
        content: `Restarted (<t:${Math.floor(Date.now() / 1000)}>)`
    }).catch(() => { });
});
client.on("error", console.error);

client.on("messageCreate", msg => {
    if (!msg.inCachedGuildChannel()) return;
    handleGameResend(msg);

    if (!msg.content.startsWith(prefix)) return;
    const args = msg.content.slice(prefix.length).split(/ +/);
    const command = args.shift();
    if (commands[command]) {
        try {
            commands[command].execute(msg, args);
        } catch (e) {
            onMsgError(e, msg);
        }
    }
});

client.on("interactionCreate", ctx => {
    patch(ctx);

    try {
        if (ctx.type === InteractionTypes.MESSAGE_COMPONENT) {
            if (ctx.isButtonComponentInteraction()) onButtonPress(ctx);
            else onSelectMenu(ctx);
        }
        else if (ctx.type === InteractionTypes.MODAL_SUBMIT) {
            onModalSubmit(ctx);
        }
    } catch (e) {
        onMsgError(e, ctx);
    }
});

client.connect();
