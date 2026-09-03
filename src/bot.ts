import { Client, Events, GatewayIntentBits } from "discord.js";
import { readyHandler } from "./ready.ts";
import { messageCreateHandler } from "./messageCreate.ts";
import { interactionCreateHandler } from "./interactionCreate.ts";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
});

client.once(Events.ClientReady, readyHandler);
client.on(Events.MessageCreate, messageCreateHandler);
client.on(Events.InteractionCreate, interactionCreateHandler);

await client.login(process.env.DISCORD_TOKEN);