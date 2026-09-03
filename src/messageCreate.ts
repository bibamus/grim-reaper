import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    type Message,
} from "discord.js";
import { pendingImagePosts } from "./pendingImagePosts.ts";

export async function messageCreateHandler(message: Message): Promise<void> {
    if (message.author.bot) {
        return;
    }

    if (message.channel.type === ChannelType.DM) {
        return;
    }

    if (message.content === "Hello!") {
        await message.reply(`Hello ${message.author.username}`);
        return;
    }

    const imageAttachments = message.attachments.filter((attachment) =>
        attachment.contentType?.startsWith("image/"),
    );
    if (imageAttachments.size > 0) {
        const originalImage = imageAttachments.first()!;
        const token = crypto.randomUUID();

        const button = new ButtonBuilder()
            .setCustomId(`fill-image-form:${token}`)
            .setLabel("Add title & description")
            .setStyle(ButtonStyle.Primary);
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

        const promptMessage = await message.reply({
            content: "Click the button to add a title and description for this image.",
            components: [row],
        });

        pendingImagePosts.set(token, {
            attachmentUrl: originalImage.url,
            fileName: originalImage.name ?? "image.png",
            message,
            promptMessage,
        });
        return;
    }

    const reversed = message.content.split("").reverse().join("");
    await message.reply(reversed);
}
