import type { Client } from "discord.js";

export function readyHandler(c: Client<true>): void {
    console.log(`Ready! Logged in as ${c.user.tag}`);
}