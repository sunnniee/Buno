import { colors, uniqueVariants, variants } from "./constants.js";
import { AnyGuildTextChannel, Message } from "oceanic.js";

export type Config = {
    prefix: string,
    emoteless: boolean,
    status: string,
    developerIds: string[],
    devPrefix: string,
    clyde: {
        enabled: boolean,
        id: string,
        name: string,
        guilds: string[]
    }
}

export type Command = {
    name: string,
    aliases?: string[]
    execute: (msg: Message<AnyGuildTextChannel>, args: string[]) => any;
}

export type PlayerStorage = {
    wins: number
    losses: number
}
export type PlayerStatsDatabaseInfo = {
    [guildID: string]: {
        [userID: string]: PlayerStorage
    }
}

export type Card = `${typeof colors[number]}-${typeof variants[number]}` | typeof uniqueVariants[number]
export type UnoGameSettings = {
    timeoutDuration: number
    kickOnTimeout: boolean
    allowSkipping: boolean,
    antiSabotage: boolean,
    allowStacking: boolean,
    randomizePlayerList: boolean,
    resendGameMessage: boolean
}
export type UnoGame<T extends boolean> = T extends true ? {
    uid: string,
    started: true,
    players: string[],
    host: string,
    cards: { [player: string]: Card[] },
    currentCard: Card,
    currentCardColor: typeof colors[number],
    deck: Card[],
    draw: (amount: number) => { cards: Card[], newDeck: Card[] },
    drawStackCounter: number,
    currentPlayer: string,
    lastPlayer: {
        id: string,
        duration: number,
    },
    settings: UnoGameSettings,
    message: Message<AnyGuildTextChannel>,
    channelID: string,
    guildID: string,
    _modified: boolean,
    clyde?: boolean
} : {
    uid: string,
    started: false,
    starting: number,
    host: string,
    players: string[],
    settings: UnoGameSettings,
    message: Message<AnyGuildTextChannel>,
    channelID: string,
    guildID: string,
    _allowSolo: boolean,
    _modified: boolean,
    clyde?: boolean
}
