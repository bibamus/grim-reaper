import type { Message } from "discord.js";

export interface PendingImagePost {
    attachmentUrl: string;
    fileName: string;
    message: Message;
    promptMessage: Message;
}

export const pendingImagePosts = new Map<string, PendingImagePost>();
