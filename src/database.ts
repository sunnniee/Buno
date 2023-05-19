import { readdir, readFile, writeFile as _writeFile } from "fs/promises";

import { client } from "./client.js";
import { defaultSettings } from "./constants.js";
import { GuildStorage } from "./types";
import { PlayerStatsDatabaseInfo, PlayerStorage } from "./types.js";

const writeFile = new Proxy(_writeFile, {
    apply(target, thisArg, argArray) {
        target.apply(thisArg, argArray).catch(e => console.log(`Failed to write to ${argArray[0]}: ${e}`));
    },
});

class PlayerStatsDatabase {
    private cache: PlayerStatsDatabaseInfo = {};
    private latestSettingsVersion = 2 as const;
    private hasInitalized = false;
    private waitingForInit = false;
    private writeOps: { [guildID: string]: Promise<void> } = {};

    defaultValue: PlayerStorage = {
        wins: 0,
        losses: 0,
        preferredSettings: defaultSettings
    } as const;

    private init = async () => {
        if (this.hasInitalized) return;
        const savedGuilds = (await readdir(process.cwd() + "/database")).filter(f => f.endsWith(".json"));
        if (client.guilds.empty) {
            if (!this.waitingForInit) {
                client.once("ready", this.init);
                this.waitingForInit = true;
            }
            return;
        }
        this.waitingForInit = false;
        [...client.guilds.keys()].forEach(async i => {
            if (!savedGuilds.includes(`${i}.json`)) {
                // @ts-expect-error
                this.cache[i] = { settingsVersion: this.latestSettingsVersion };
                await this.write(i);
            }
        });
        savedGuilds.forEach(async filename =>
            this.cache[filename.split(".")[0]] = JSON.parse(await readFile(`${process.cwd()}/database/${filename}`, "utf8"))
        );
        this.hasInitalized = true;
    };

    private migrateSettings = (object: GuildStorage) => {
        if (!object) return;
        const version = object.settingsVersion ?? 1;
        switch (version) {
            case 1: { /* { wins: number, losses: number } */
                Object.keys(object).forEach(k => object[k] = {
                    ...object[k],
                    preferredSettings: defaultSettings
                });
                break;
            }
            case 2: { /* { wins: number, losses: number, preferredSettings: UnoGameSettings } */
                break;
            }
        }
        object.settingsVersion = this.latestSettingsVersion;
        return object;
    };

    private write = async (guildId: string) => {
        if (this.writeOps[guildId]) this.writeOps[guildId].then(() => writeFile(`${process.cwd()}/database/${guildId}.json`, JSON.stringify(this.cache[guildId])));
        else this.writeOps[guildId] = writeFile(`${process.cwd()}/database/${guildId}.json`, JSON.stringify(this.cache[guildId]));
    };

    get(guildId: string, playerId: string): PlayerStorage | undefined {
        if (!this.hasInitalized) return;
        const guild = this.cache[guildId];
        if (guild.settingsVersion !== this.latestSettingsVersion) {
            this.cache[guildId] = this.migrateSettings(guild);
            this.write(guildId);
        }
        return guild[playerId];
    }

    getAllForGuild(guildId: string): GuildStorage | undefined {
        if (!this.hasInitalized) return {} as any;
        const guild = this.cache[guildId];
        if (guild.settingsVersion !== this.latestSettingsVersion) {
            this.cache[guildId] = this.migrateSettings(guild);
            this.write(guildId);
        }
        return guild;
    }

    set(guildId: string, playerId: string, newValue: Partial<PlayerStorage>): void {
        if (!this.hasInitalized) return;
        let current = this.cache[guildId][playerId];
        if (!current) current = { ...this.defaultValue };
        this.cache[guildId][playerId] = { ...newValue, ...current };
        if (this.cache[guildId].settingsVersion !== this.latestSettingsVersion)
            this.cache[guildId] = this.migrateSettings(this.cache[guildId]);
        this.write(guildId);
    }

    setBulk(guildId: string, values: { [id: string]: Partial<PlayerStorage> }): void {
        if (!this.hasInitalized) return;
        Object.entries(values).forEach(([id, value]) => {
            let current = this.cache[guildId][id];
            if (!current) current = { ...this.defaultValue };
            this.cache[guildId][id] = { ...value, ...current };
        });
        if (this.cache[guildId].settingsVersion !== this.latestSettingsVersion)
            this.cache[guildId] = this.migrateSettings(this.cache[guildId]);
        this.write(guildId);
    }

    constructor() {
        this.init();
    }
}

const database = new PlayerStatsDatabase();
export default database;
