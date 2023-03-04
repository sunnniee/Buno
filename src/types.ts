import { colors, uniqueVariants, variants } from "./constants.js"
import { AnyGuildTextChannel, Message } from "oceanic.js"

export type Command = {
    name: string,
    execute: (msg: Message<AnyGuildTextChannel>, args: string[]) => any;
}

export type UserID = string;
export type Card = `${typeof colors[number]}-${typeof variants[number]}` | typeof uniqueVariants[number]

export type UnoGameSettings = {
    timeoutDuration: number
    kickOnTimeout: boolean
    allowSkipping: boolean,
    antiSabotage: boolean,
    allowStacking: boolean,
}
export type UnoGame<T extends boolean> = T extends true ? {
    started: true,
    players: UserID[],
    host: UserID,
    cards: { [player: UserID]: Card[] },
    currentCard: Card,
    currentCardColor: typeof colors[number],
    deck: Card[],
    draw: (amount: number) => { cards: Card[], newDeck: Card[] },
    currentPlayer: UserID,
    lastPlayer: {
        id: UserID,
        duration: number
    },
    timeout: NodeJS.Timeout,
    settings: UnoGameSettings
    message: Message<AnyGuildTextChannel>,
} : {
    started: false,
    host: UserID,
    players: UserID[],
    settings: UnoGameSettings,
    message: Message<AnyGuildTextChannel>,
    _allowSolo: boolean,
}
