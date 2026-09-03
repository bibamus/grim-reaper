import type { Message, User } from "discord.js";

export interface PendingImagePost {
    attachmentUrl: string;
    fileName: string;
    author: User;
    message: Message;
    promptMessage: Message;
}

export const pendingImagePosts = new Map<string, PendingImagePost>();
