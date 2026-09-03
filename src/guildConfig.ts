import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface GuildConfig {
    imageChannelIds?: string[];
}

const CONFIG_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "guild-config.json");

function loadConfig(): Record<string, GuildConfig> {
    if (!existsSync(CONFIG_PATH)) {
        return {};
    }
    try {
        return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
    } catch {
        return {};
    }
}

function saveConfig(config: Record<string, GuildConfig>): void {
    mkdirSync(dirname(CONFIG_PATH), { recursive: true });
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function getImageChannelIds(guildId: string): string[] {
    const config = loadConfig();
    return config[guildId]?.imageChannelIds ?? [];
}

export function addImageChannelId(guildId: string, channelId: string): boolean {
    const config = loadConfig();
    const existing = config[guildId]?.imageChannelIds ?? [];
    if (existing.includes(channelId)) {
        return false;
    }
    config[guildId] = { ...config[guildId], imageChannelIds: [...existing, channelId] };
    saveConfig(config);
    return true;
}

export function removeImageChannelId(guildId: string, channelId: string): boolean {
    const config = loadConfig();
    const existing = config[guildId]?.imageChannelIds ?? [];
    if (!existing.includes(channelId)) {
        return false;
    }
    config[guildId] = {
        ...config[guildId],
        imageChannelIds: existing.filter((id) => id !== channelId),
    };
    saveConfig(config);
    return true;
}

