import { PlayerStatsDatabaseInfo, PlayerStorage } from "./types.js"
import { readdir, readFile, writeFile as _writeFile } from "fs/promises"
import { client } from "./client.js"

const writeFile = new Proxy(_writeFile, {
    apply(target, thisArg, argArray) {
        target.apply(thisArg, argArray).catch(e => console.log(`Failed to write to ${argArray[0]}: ${e}`))
    },
})

class PlayerStatsDatabase {
    private cache: PlayerStatsDatabaseInfo = {}
    private hasInitalized = false
    private waitingForInit = false
    private writeOps: { [guildID: string]: Promise<void> } = {}
    private init = async () => {
        if (this.hasInitalized) return
        const savedGuilds = (await readdir(process.cwd() + "/database")).filter(f => f.endsWith(".json"))
        if (client.guilds.empty) {
            if (!this.waitingForInit) {
                client.once("ready", this.init)
                this.waitingForInit = true
            }
            return
        }
        this.waitingForInit = false;
        [...client.guilds.keys()].forEach(async i => {
            if (!savedGuilds.includes(i)) {
                this.cache[i] = {}
                await this.write(i)
            }
        })
        savedGuilds.forEach(async filename =>
            this.cache[filename.split(".")[0]] = JSON.parse(await readFile(`${process.cwd()}/database/${filename}`, "utf8"))
        )
        this.hasInitalized = true
    }
    private write = async (guildId: string) => {
        if (this.writeOps[guildId]) this.writeOps[guildId].then(() => writeFile(`${process.cwd()}/database/${guildId}.json`, JSON.stringify(this.cache[guildId])))
        else this.writeOps[guildId] = writeFile(`${process.cwd()}/database/${guildId}.json`, JSON.stringify(this.cache[guildId]))
    }

    get(guildId: string, playerId: string): PlayerStorage {
        if (!this.hasInitalized) return
        return this.cache[guildId][playerId]
    }

    getAllForGuild(guildId: string) {
        if (!this.hasInitalized) return {}
        return this.cache[guildId]
    }

    set(guildId: string, playerId: string, newValue: PlayerStorage): void {
        if (!this.hasInitalized) return
        this.cache[guildId][playerId] = newValue
        this.write(guildId)
    }

    setMultiple(guildId: string, values: { [id: string]: PlayerStorage }): void {
        if (!this.hasInitalized) return
        Object.entries(values).forEach(([id, value]) => this.cache[guildId][id] = value)
        this.write(guildId)
    }

    constructor() {
        this.init()
    }
}

const database = new PlayerStatsDatabase()
export default database
