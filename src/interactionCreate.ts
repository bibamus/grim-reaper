import {
    AttachmentBuilder,
    EmbedBuilder,
    LabelBuilder,
    ModalBuilder,
    StringSelectMenuBuilder,
    TextInputBuilder,
    TextInputStyle,
    type Interaction,
} from "discord.js";
import { pendingImagePosts } from "./pendingImagePosts.ts";

const SCRIPT_OPTIONS = ["Trouble Brewing", "Bad Moon Rising", "Sects and Violets"];

export async function interactionCreateHandler(interaction: Interaction): Promise<void> {
    if (interaction.isButton() && interaction.customId.startsWith("fill-image-form:")) {
        const token = interaction.customId.slice("fill-image-form:".length);
        const pending = pendingImagePosts.get(token);
        if (!pending) {
            await interaction.reply({ content: "This form has expired.", ephemeral: true });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId(`image-form:${token}`)
            .setTitle("Image details");

        const titleLabel = new LabelBuilder()
            .setLabel("Title")
            .setTextInputComponent((input: TextInputBuilder) =>
                input.setCustomId("title").setStyle(TextInputStyle.Short).setRequired(true),
            );
        const descriptionLabel = new LabelBuilder()
            .setLabel("Description")
            .setTextInputComponent((input: TextInputBuilder) =>
                input.setCustomId("description").setStyle(TextInputStyle.Paragraph).setRequired(true),
            );
        const scriptLabel = new LabelBuilder()
            .setLabel("Script")
            .setStringSelectMenuComponent((select: StringSelectMenuBuilder) =>
                select
                    .setCustomId("script")
                    .setRequired(true)
                    .addOptions(
                        SCRIPT_OPTIONS.map((option) => ({ label: option, value: option })),
                    ),
            );

        modal.addLabelComponents(titleLabel, descriptionLabel, scriptLabel);

        await interaction.showModal(modal);
        return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("image-form:")) {
        const token = interaction.customId.slice("image-form:".length);
        const pending = pendingImagePosts.get(token);
        if (!pending) {
            await interaction.reply({ content: "This form has expired.", ephemeral: true });
            return;
        }
        pendingImagePosts.delete(token);

        const title = interaction.fields.getTextInputValue("title");
        const description = interaction.fields.getTextInputValue("description");
        const [script] = interaction.fields.getStringSelectValues("script");
        if (!script) {
            await interaction.reply({ content: "Please select a script.", ephemeral: true });
            return;
        }

        const attachment = new AttachmentBuilder(pending.attachmentUrl, { name: pending.fileName });
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .addFields([{ name: "Script", value: script }])
            .setImage(`attachment://${pending.fileName}`);

        if (!interaction.channel?.isSendable()) {
            await interaction.reply({ content: "Could not post here.", ephemeral: true });
            return;
        }

        await interaction.channel.send({ embeds: [embed], files: [attachment] });
        await interaction.reply({ content: "Posted!", ephemeral: true });

        await pending.promptMessage.delete().catch(() => undefined);
        await pending.message.delete().catch(() => undefined);
    }
}
