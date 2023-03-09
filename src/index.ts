import { client } from "./client.js"
import { readdir } from "fs"
import { Command } from "./types.js"
import { onButtonPress, onModalSubmit, onSelectMenu } from "./gameLogic/index.js"
import { ActivityTypes, InteractionTypes } from "oceanic.js"
import { patch } from "./patchContext.js"

const prefix = process.argv[2] === "--dev" ? "]]" : "]"

const commands: { [k: string]: Command } = {}
// why the fuck does it need ./src specified
readdir("./src/commands", (err, res) => {
    if (err) throw err
    res.forEach(
        f => (import(`./commands/${f.slice(0, -3)}.js`) as Promise<{ cmd: Command }>)
            .then(c => {
                if (commands[c.cmd.name]) return console.error(`Duplicate command ${c.cmd.name}`)
                commands[c.cmd.name] = c.cmd
            })
    )
})

client.on("ready", () => {
    console.log("Ready as", client.user.tag)
    client.editStatus("online", [{ name: `In memory of Enzo, gone but never forgotten - ${prefix}uno`, type: ActivityTypes.GAME }])
})
client.on("error", console.error)

client.on("messageCreate", msg => {
    if (!msg.inCachedGuildChannel()) return
    if (!msg.content.startsWith(prefix)) return
    const args = msg.content.slice(prefix.length).split(/ +/)
    const command = args.shift()
    if (commands[command]) commands[command].execute(msg, args)
})

client.on("interactionCreate", ctx => {
    ctx = patch(ctx)
    if (ctx.type === InteractionTypes.MESSAGE_COMPONENT) {
        if (ctx.isButtonComponentInteraction()) onButtonPress(ctx)
        else onSelectMenu(ctx)
    }
    else if (ctx.type === InteractionTypes.MODAL_SUBMIT) {
        onModalSubmit(ctx)
    }
})

client.connect()
