import { Module } from "../core/attributes/module";
import { ModuleOptions } from "../core/moduleoptions";
import { IModule } from "../core/imodule";
import { AccessManager, TemplateManager } from "../core/managers";
import { Command, CommandSample, CommandDescription, CommandOptions, CommandPermission } from "../core/command";
import { IMessage } from "../core/imessage";
import { injectable } from "inversify";
import { TemplateMessageID } from "../core/itemplatemessageid";
import { DiscordAPI } from "../api/discord";
import { identifiers } from "../../config";
import { RichEmbed } from "discord.js";

@Module("Core", "This is the core module", ModuleOptions.AlwaysOn)
@injectable()
export class CoreModule extends IModule
{
    @Command("help", CommandOptions.HideInHelp | CommandOptions.Global)
    private async handleHelp(message: IMessage)
    {
        let response: RichEmbed = new RichEmbed();
        response.setDescription(this._bot.get(TemplateManager).get(TemplateMessageID.Help, {
            author: message.author.id
        }));

        const role = await message.user.getRole(message.server);
        let modules = [];

        for (const key of this._bot.modules) {
            const module: IModule = this._bot.get(key);
            const enabled = module.alwaysOn ? true : (message.server === null) ? false : await message.server.isModuleEnabled(module.name);

            if (enabled) {
                modules.push(module.name);
            }

            let hasNonHidden = false;
            let tmp = "";

            for (const command of module.commands) {
                if (command.permission !== null && !this._bot.get(AccessManager).isAllowed(command.permission as string, role, message.server)) {
                    continue;
                }

                if (command.hideInHelp === undefined || command.hideInHelp === false) {
                    const isPrivate = command.private !== undefined && command.private === true;

                    if (message.server !== null && isPrivate) {
                        continue;
                    }

                    if (command.global === false && !enabled) {
                        continue;
                    }

                    hasNonHidden = true;

                    tmp += `**${identifiers[0]}${command.sample}**: ${command.description}\r\n`;
                }
            }

            if (!hasNonHidden) {
                continue;
            }

            response.addField(module.name, tmp);
            // response.addBlankField();
        }

        if (message.server !== null) {
            response.addField("Enabled Modules", modules.join(", "));
        }

        this._bot.get(DiscordAPI).respond(message, response).catch((err) => {
            console.log("err", err);
        });
    }

    // @Command("set response mode to {responsetype!type}")
    // @Command("use {responsetype!type}")
    // @Command("use {responsetype!type} mode")
    // @CommandDescription("Change my personality to Normal or Tsundere")
    // @CommandSample("set response mode to __*tsundere*__")
    // @CommandPermission("CHANGE_PERSONALITY")
    // private handleResponseMode(message: IMessage, type: string)
    // {
    //     if (type === null) {
    //         //unknown response mode
    //     }

    //     // if (Responses.currentMode === args.type)
    //     //     return this._bot.respond(message, StringFormat(Responses.get("ALREADY_IN_MODE"), { author: message.author.id }));

    //     // Responses.setMode(args.type);
    //     // this._bot.respond(message, StringFormat(Responses.get("SWITCHED"), { author: message.author.id }));
    // }

    @Command("use {channelid!channel} <for {category}>")
    @CommandDescription("Tells me to output to the specified channel.")
    @CommandSample("use __#channel__")
    @CommandPermission("SERVERADMIN")
    private handleGotoChannel(message: IMessage, channel: string, category: string = null)
    {
        if (message.guild.channels.get(channel) === null) {
            return this._bot.get(DiscordAPI).respond(message, this._bot.get(TemplateManager).get(TemplateMessageID.InvalidChannel, {
                author: message.author.id,
                channel: channel
            }));
        }

        message.server.setChannel(channel, category);

        this._bot.get(DiscordAPI).message(this._bot.get(TemplateManager).get(TemplateMessageID.SempaiHomeChannelChanged, {
            author: message.author.id,
            channel: channel,
        }), message.server);
    }
}
