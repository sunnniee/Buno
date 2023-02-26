import { colors, uniqueVariants, variants } from "./constants.js"
import { Message } from "oceanic.js"

export type Command = {
    name: string,
    execute: (msg: Message, args: string[]) => any;
}

export type UserID = string;
export type Card = `${typeof colors[number]}-${typeof variants[number]}` | typeof uniqueVariants[number]

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
    lastPlayer: UserID | null
    message: Message,
} : {
    started: false,
    host: UserID,
    players: UserID[],
    message: Message
}
