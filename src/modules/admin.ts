import { Module } from "../core/attributes/module";
import { ModuleOptions } from "../core/moduleoptions";
import { IModule } from "../core/imodule";
import { Command, CommandSample, CommandDescription, CommandPermission, CommandOptions } from "../core/command";
import { IMessage } from "../core/imessage";
import { RoleType } from "../core/roletype";
import { RegisterRight } from "../core/attributes/registerright";
import { injectable } from "inversify";
import { DiscordAPI } from "../api/discord";
import { TemplateManager } from "../core/managers";
import { TemplateMessageID } from "../core/itemplatemessageid";
import { DBServer } from "../models/dbserver";
import * as Modules from "../modules";
import { RichEmbed } from "discord.js";

@RegisterRight("SUPERADMIN", RoleType.SuperAdmin)
@RegisterRight("SERVERADMIN", RoleType.Admin)
@Module("Admin", "This is the admin module.", ModuleOptions.AlwaysOn)
@injectable()
export class AdminModule extends IModule
{
    @Command("blacklist server {server}", CommandOptions.Global)
    @CommandSample("blacklist server __server__")
    @CommandDescription("Blacklists a server.")
    @CommandPermission("SUPERADMIN")
    private handleServerBlacklist(message: IMessage, args: { [key: string]: any }): void
    {
        // const server = this._bot.getServer(args.server);

        // if (server === null) {
        //     this._bot.respond(message, PersonalityManager.instance.get(MessageID.InvalidServer, {
        //         author: message.author.id,
        //         id: args.server,
        //     }));

        //     return;
        // }

        // if (this._bot.isServerBlacklisted(server.id)) {
        //     this._bot.respond(message, PersonalityManager.instance.get(MessageID.ServerAlreadyBlacklisted, {
        //         author: message.author.id,
        //         server_name: server.server.name,
        //     }));

        //     return;
        // }

        // this._bot.blacklistServer(server.id);
        // this._bot.respond(message, PersonalityManager.instance.get(MessageID.ServerBlacklisted, {
        //     author: message.author.id,
        //     server_name: server.server.name,
        // }));
    }

    @Command("whitelist server {server}", CommandOptions.Global)
    @CommandSample("whitelist server __server__")
    @CommandDescription("Whitelists a server.")
    @CommandPermission("SUPERADMIN")
    private handleServerWhitelist(message: IMessage, args: { [key: string]: any })
    {
        // const server = this._bot.getServer(args.server);

        // if (server === null)
        //     return this._bot.respond(message, PersonalityManager.instance.get(MessageID.InvalidServer, {
        //         author: message.author.id,
        //         id: args.server,
        //     }));

        // if (!this._bot.isServerBlacklisted(server.id))
        //     return this._bot.respond(message, PersonalityManager.instance.get(MessageID.ServerNotBlacklisted, {
        //         author: message.author.id,
        //         server_name: server.server.name,
        //     }));

        // this._bot.whitelistServer(server.id);
        // this._bot.respond(message, PersonalityManager.instance.get(MessageID.ServerWhitelisted, {
        //     author: message.author.id,
        //     server_name: server.server.name,
        // }));
    }

    @Command("blacklist user {userid!user}", CommandOptions.Global)
    @CommandSample("blacklist user __@user__")
    @CommandDescription("Blacklists an user.")
    @CommandPermission("SUPERADMIN")
    private handleUserBlacklist(message: IMessage, args: { [key: string]: any })
    {
        // const user: User = UserManager.instance.getUser(args.user, message.server);
        // if (user === null)
        //     return this._bot.respond(message, PersonalityManager.instance.get(MessageID.InvalidUser, {
        //         author: message.author.id,
        //         user: args.user,
        //     }));

        // this._bot.blacklistUser(user);
        // return this._bot.respond(message, PersonalityManager.instance.get(MessageID.UserBlacklisted, {
        //     author: message.author.id,
        //     user: user.getUserID(),
        // }));
    }

    @Command("whitelist user {userid!user}", CommandOptions.Global)
    @CommandSample("whitelist user __@user__")
    @CommandDescription("Whitelists an user.")
    @CommandPermission("SUPERADMIN")
    private handleUserWhitelist(message: IMessage, args: { [key: string]: any })
    {
        // const user: User = UserManager.instance.getUser(args.user, message.server);
        // if (user === null)
        //     return this._bot.respond(message, PersonalityManager.instance.get(MessageID.InvalidUser, {
        //         author: message.author.id,
        //         user: args.user,
        //     }));

        // this._bot.whitelistUser(user);
        // return this._bot.respond(message, PersonalityManager.instance.get(MessageID.UserWhitelisted, {
        //     author: message.author.id,
        //     user: user.getUserID(),
        // }));
    }

    @Command("user blacklist", CommandOptions.Global)
    @CommandSample("user blacklist")
    @CommandDescription("Displays the user blacklist")
    @CommandPermission("SUPERADMIN")
    private handleShowUserBlacklist(message: IMessage, args: { [key: string]: any })
    {
        // let id = "ID";
        // let name = "Name";

        // while (id.length < 25)
        //     id += " ";

        // while (name.length < 30)
        //     name += " ";

        // let response = "```";
        // response += id + " " + name;

        // let num = 0;
        // for (const key in UserManager.instance.users) {
        //     const user = UserManager.instance.users[key];

        //     if (!this._bot.isUserBlacklisted(user))
        //         continue;

        //     id = "" + user.getUserID();
        //     name = user.getUsername();

        //     while (id.length < 25)
        //         id += " ";

        //     while (name.length < 30)
        //         name += " ";

        //     response += "\r\n";
        //     response += id + " " + name;
        //     num++;
        // }

        // if (num === 0) {
        //     response += "\r\n";
        //     response += "User blacklist is empty.";
        // }

        // response += "```";

        // this._bot.respond(message, PersonalityManager.instance.get(MessageID.UserBlacklist, {
        //     author: message.author.id,
        //     response,
        // }));
    }

    @Command("server blacklist", CommandOptions.Global)
    @CommandSample("server blacklist")
    @CommandDescription("Displays the server blacklist")
    @CommandPermission("SUPERADMIN")
    private handleShowServerBlacklist(message: IMessage, args: { [key: string]: any })
    {
        // let id = "ID";
        // let name = "Name";
        // let owner = "Owner";

        // while (id.length < 10)
        //     id += " ";

        // while (name.length < 20)
        //     name += " ";

        // while (owner.length < 20)
        //     owner += " ";

        // let response = "```";
        // response += id + " " + name + " " + owner;

        // let num = 0;
        // for (const key in this._bot.servers) {
        //     const server = this._bot.servers[key];
        //     if (!this._bot.isServerBlacklisted(server.id))
        //         continue;

        //     id = "#" + server.id + ".";
        //     name = server.server.name;
        //     owner = server.server.owner.displayName;

        //     while (id.length < 10)
        //         id += " ";

        //     while (name.length < 20)
        //         name += " ";

        //     while (owner.length < 20)
        //         owner += " ";

        //     response += "\r\n";
        //     response += id + " " + name + " " + owner;
        //     num++;
        // }

        // if (num === 0) {
        //     response += "\r\n";
        //     response += "Server blacklist is empty.";
        // }
        // response += "```";

        // this._bot.respond(message, PersonalityManager.instance.get(MessageID.ServerBlacklist, {
        //     author: message.author.id,
        //     response,
        // }));
    }

    @Command("servers", CommandOptions.Global)
    @CommandSample("servers")
    @CommandDescription("Lists all the servers I'm currently running on.")
    @CommandPermission("SUPERADMIN")
    private async handleListServers(message: IMessage)
    {
        const servers = await DBServer.find();
        const discord = this._bot.get(DiscordAPI);
        let data = [];

        for (const server of servers) {
            if (server.blacklisted) {
                continue;
            }

            const info = discord.getGuild(server.id);

            if (!info) {
                continue;
            }

            data.push({
                id: info.id,
                name: info.name,
                owner: info.owner.nickname || info.owner.user.username,
            });
        }

        const embed = new RichEmbed();
        embed.setDescription(this._bot.get(TemplateManager).get(TemplateMessageID.ListServers, {
            author: message.author.id,
        }));
        embed.addField("ID", data.map(x => x.id).join("\r\n"), true);
        embed.addField("Name", data.map(x => x.name).join("\r\n"), true);
        embed.addField("Owner", data.map(x => x.owner).join("\r\n"), true);

        discord.respond(message, embed);
    }

    @Command("enable {moduleName}")
    @CommandSample("enable __module name__")
    @CommandDescription("Enables a module for this server.")
    @CommandPermission("SERVERADMIN")
    private async handleEnableModule(message: IMessage, moduleName: string)
    {
        const moduleInternalName = moduleName.toLowerCase().trim();
        const module = Object.values(Modules).filter(x => (x as any)._moduleName.toLowerCase().trim() === moduleInternalName);

        if (module.length === 0) {
            return this._bot.get(DiscordAPI).respond(message, this._bot.get(TemplateManager).get(TemplateMessageID.InvalidModule, {
                author: message.author.id,
                module,
            }));
        }

        if (await message.server.isModuleEnabled(moduleInternalName)) {
            return this._bot.get(DiscordAPI).respond(message, this._bot.get(TemplateManager).get(TemplateMessageID.ModuleAlreadyEnabled, {
                author: message.author.id,
                module,
            }));
        }

        await message.server.enableModule(moduleInternalName);

        const moduleInstance: any = this._bot.get(moduleInternalName);
        return this._bot.get(DiscordAPI).respond(message, this._bot.get(TemplateManager).get(TemplateMessageID.ModuleEnabled, {
            author: message.author.id,
            module: moduleInstance.name,
        }));
    }

    @Command("disable {moduleName}")
    @CommandSample("disable __module name__")
    @CommandDescription("Disables a module for this server.")
    @CommandPermission("SERVERADMIN")
    private async handleDisableModule(message: IMessage, moduleName: string)
    {
        const moduleInternalName = moduleName.toLowerCase().trim();
        const module = Object.values(Modules).filter(x => (x as any)._moduleName.toLowerCase().trim() === moduleInternalName);

        if (module.length === 0) {
            return this._bot.get(DiscordAPI).respond(message, this._bot.get(TemplateManager).get(TemplateMessageID.InvalidModule, {
                author: message.author.id,
                module,
            }));
        }

        const moduleInstance: any = this._bot.get(moduleInternalName);

        if (!await message.server.isModuleEnabled(moduleInternalName)) {
            return this._bot.get(DiscordAPI).respond(message, this._bot.get(TemplateManager).get(TemplateMessageID.ModuleAlreadyDisabled, {
                author: message.author.id,
                module,
            }));
        }

        if (moduleInstance.alwaysOn) {
            return this._bot.get(DiscordAPI).respond(message, this._bot.get(TemplateManager).get(TemplateMessageID.ModuleCannotBeDisabled, {
                author: message.author.id,
                module,
            }));
        }

        await message.server.disableModule(moduleInternalName);

        return this._bot.get(DiscordAPI).respond(message, this._bot.get(TemplateManager).get(TemplateMessageID.ModuleDisabled, {
            author: message.author.id,
            module: moduleInstance.name,
        }));
    }

    @Command("modules")
    @CommandSample("modules")
    @CommandDescription("Lists all available modules.")
    @CommandPermission("SERVERADMIN")
    private async handleListModules(message: IMessage)
    {
        const modules = Modules as { [key: string]: any };
        const columns = { name: "Name", enabled: "Enabled", flags: "Flags" };
        const data = [];

        for (const key in modules) {
            const moduleInstance: IModule = this._bot.get<IModule>(modules[key]._moduleName.toLowerCase().trim());
            const enabled = await message.server.isModuleEnabled(modules[key]._moduleName);
            const alwaysOn = moduleInstance.alwaysOn;
            const defaultOn = moduleInstance.defaultOn;

            let flags = "";
            if (alwaysOn) {
                flags += "always_on";
            }

            if (defaultOn) {
                flags += flags.length === 0 ? "default_on" : " default_on";
            }

            data.push({ name: modules[key]._moduleName, enabled: (enabled) ? "yes" : "no", flags });
        }

        const embed = new RichEmbed();
        embed.setDescription(this._bot.get(TemplateManager).get(TemplateMessageID.ListModules, {
            author: message.author.id,
        }));
        embed.addField("Name", data.map(x => x.name).join("\r\n"), true);
        embed.addField("Enabled", data.map(x => x.enabled).join("\r\n"), true);
        embed.addField("Flags", data.map(x => x.flags).join("\r\n"), true);

        this._bot.get(DiscordAPI).respond(message, embed);
    }
}
