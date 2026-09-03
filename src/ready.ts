import { ChannelType, Client, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export async function readyHandler(c: Client<true>): Promise<void> {
    console.log(`Ready! Logged in as ${c.user.tag}`);

    const command = new SlashCommandBuilder()
        .setName("grim-channel")
        .setDescription("Configure which channels the bot listens to for image posts")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((sub) =>
            sub
                .setName("add")
                .setDescription("Add a channel to listen on")
                .addChannelOption((option) =>
                    option
                        .setName("channel")
                        .setDescription("The channel to listen on")
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName("remove")
                .setDescription("Remove a channel from the listen list")
                .addChannelOption((option) =>
                    option
                        .setName("channel")
                        .setDescription("The channel to stop listening on")
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true),
                ),
        )
        .addSubcommand((sub) => sub.setName("list").setDescription("List the configured channels"));

    await Promise.all(
        c.guilds.cache.map((guild) => guild.commands.set([command])),
    );
}