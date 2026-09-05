import {
    AttachmentBuilder,
    LabelBuilder,
    ModalBuilder,
    StringSelectMenuBuilder,
    TextInputBuilder,
    TextInputStyle,
    type Interaction,
} from "discord.js";
import {pendingImagePosts} from "./pendingImagePosts.ts";
import {addImageChannelId, getImageChannelIds, removeImageChannelId} from "./guildConfig.ts";

const SCRIPT_OPTIONS = ["Trouble Brewing", "Bad Moon Rising", "Sects and Violets"];
const OTHER_SCRIPT_OPTION = "Other";
const WINNER_EMOJIS: Record<string, string> = {
    Good: "😇",
    Evil: "😈",
};

export async function interactionCreateHandler(interaction: Interaction): Promise<void> {
    if (interaction.isChatInputCommand() && interaction.commandName === "grim-channel") {
        if (!interaction.inGuild()) {
            await interaction.reply({content: "This command can only be used in a server.", ephemeral: true});
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "add") {
            const channel = interaction.options.getChannel("channel", true);
            const added = addImageChannelId(interaction.guildId, channel.id);
            await interaction.reply({
                content: added
                    ? `Now listening for images in <#${channel.id}>.`
                    : `<#${channel.id}> is already configured.`,
                ephemeral: true,
            });
            return;
        }

        if (subcommand === "remove") {
            const channel = interaction.options.getChannel("channel", true);
            const removed = removeImageChannelId(interaction.guildId, channel.id);
            await interaction.reply({
                content: removed
                    ? `Stopped listening for images in <#${channel.id}>.`
                    : `<#${channel.id}> was not configured.`,
                ephemeral: true,
            });
            return;
        }

        if (subcommand === "list") {
            const channelIds = getImageChannelIds(interaction.guildId);
            await interaction.reply({
                content:
                    channelIds.length > 0
                        ? `Configured channels:\n${channelIds.map((id) => `- <#${id}>`).join("\n")}`
                        : "No channels are configured.",
                ephemeral: true,
            });
            return;
        }

        return;
    }

    if (interaction.isButton() && interaction.customId.startsWith("dismiss-image-form:")) {
        const token = interaction.customId.slice("dismiss-image-form:".length);
        const pending = pendingImagePosts.get(token);
        if (!pending) {
            await interaction.deferUpdate().catch(() => undefined);
            if ("delete" in interaction.message) {
                await interaction.message.delete().catch(() => undefined);
            }
            return;
        }

        if (interaction.user.id !== pending.author.id) {
            await interaction.reply({
                content: "Only the author of the image can dismiss this.",
                ephemeral: true,
            });
            return;
        }

        if (pending.timeout) {
            clearTimeout(pending.timeout);
        }
        pendingImagePosts.delete(token);

        await interaction.deferUpdate();
        await pending.promptMessage.delete().catch(() => undefined);
        return;
    }

    if (interaction.isButton() && interaction.customId.startsWith("fill-image-form:")) {
        const token = interaction.customId.slice("fill-image-form:".length);
        const pending = pendingImagePosts.get(token);
        if (!pending) {
            await interaction.reply({content: "This form has expired.", ephemeral: true});
            return;
        }

        if (interaction.user.id !== pending.author.id) {
            await interaction.reply({
                content: "Only the author of the image can fill out this form.",
                ephemeral: true,
            });
            return;
        }

        if (pending.timeout) {
            clearTimeout(pending.timeout);
        }
        pending.timeout = setTimeout(async () => {
            const p = pendingImagePosts.get(token);
            if (p) {
                pendingImagePosts.delete(token);
                await p.promptMessage.delete().catch(() => undefined);
            }
        }, 10 * 60 * 1000);

        const modal = new ModalBuilder()
            .setCustomId(`image-form:${token}`)
            .setTitle("Image details");


        const scriptLabel = new LabelBuilder()
            .setLabel("Script")
            .setStringSelectMenuComponent((select: StringSelectMenuBuilder) =>
                select
                    .setCustomId("script")
                    .setRequired(true)
                    .addOptions(
                        [...SCRIPT_OPTIONS, OTHER_SCRIPT_OPTION].map((option) => ({
                            label: option,
                            value: option,
                        })),
                    ),
            );

        const customScriptLabel = new LabelBuilder()
            .setLabel(`Custom script name (if "${OTHER_SCRIPT_OPTION}" selected)`)
            .setTextInputComponent((input: TextInputBuilder) =>
                input.setCustomId("customScript").setStyle(TextInputStyle.Short).setRequired(false),
            );

        const titleLabel = new LabelBuilder()
            .setLabel("Title")
            .setTextInputComponent((input: TextInputBuilder) =>
                input.setCustomId("title").setStyle(TextInputStyle.Short).setRequired(false),
            );
        const descriptionLabel = new LabelBuilder()
            .setLabel("Description")
            .setTextInputComponent((input: TextInputBuilder) =>
                input.setCustomId("description").setStyle(TextInputStyle.Paragraph).setRequired(false),
            );

        const winnerLabel = new LabelBuilder()
            .setLabel("Winner")
            .setStringSelectMenuComponent((select: StringSelectMenuBuilder) =>
                select
                    .setCustomId("winner")
                    .setRequired(true)
                    .addOptions(
                        Object.keys(WINNER_EMOJIS).map((option) => ({label: option, value: option})),
                    ),
            );

        modal.addLabelComponents(scriptLabel, winnerLabel, customScriptLabel, titleLabel, descriptionLabel);

        await interaction.showModal(modal);
        return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("image-form:")) {
        await interaction.deferReply({ephemeral: true});

        const token = interaction.customId.slice("image-form:".length);
        const pending = pendingImagePosts.get(token);
        if (!pending) {
            await interaction.editReply({content: "This form has expired."});
            return;
        }

        if (interaction.user.id !== pending.author.id) {
            await interaction.editReply({content: "Only the author of the image can submit this form."});
            return;
        }

        const title = interaction.fields.getTextInputValue("title");
        const description = interaction.fields.getTextInputValue("description");
        const [selectedScript] = interaction.fields.getStringSelectValues("script");
        if (!selectedScript) {
            await interaction.editReply({content: "Please select a script."});
            return;
        }

        let script = selectedScript;
        if (selectedScript === OTHER_SCRIPT_OPTION) {
            const customScript = interaction.fields.getTextInputValue("customScript").trim();
            if (!customScript) {
                await interaction.editReply({
                    content: `Please enter a custom script name when "${OTHER_SCRIPT_OPTION}" is selected.`,
                });
                return;
            }
            script = customScript;
        }

        const attachment = new AttachmentBuilder(pending.attachmentUrl, {name: pending.fileName});
        const [winner] = interaction.fields.getStringSelectValues("winner");
        const winnerEmoji = winner ? WINNER_EMOJIS[winner] : undefined;
        if (!winnerEmoji) {
            await interaction.editReply({content: "Please select a winner."});
            return;
        }

        const headeline = title ? `# ${title} (${script})` : `# ${script}`;
        const content = `${headeline}\n${description}\n-# Submitted by ${pending.author}`;

        if (!interaction.channel?.isSendable()) {
            await interaction.editReply({content: "Could not post here."});
            return;
        }

        const posted = await interaction.channel.send({content, files: [attachment]});
        await posted.react(winnerEmoji);
        await interaction.editReply({content: "Posted!"});

        if (pending.timeout) {
            clearTimeout(pending.timeout);
        }
        pendingImagePosts.delete(token);

        await pending.promptMessage.delete().catch(() => undefined);
        await pending.message.delete().catch(() => undefined);
    }
}
