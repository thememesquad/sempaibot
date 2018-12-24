import { Module } from "../core/attributes/module";
import { ModuleOptions } from "../core/moduleoptions";
import { IModule } from "../core/imodule";
import { AccessManager, TemplateManager } from "../core/managers";
import { Command, CommandSample, CommandDescription, CommandOptions, CommandPermission } from "../core/command";
import { IMessage } from "../core/imessage";
import { DBServer } from "../core/models/dbserver";
import { RoleType } from "../core/roletype";
import { injectable } from "inversify";
import { TemplateMessageID } from "../core/itemplatemessageid";
import { DiscordAPI } from "../api/discord";
import { identifiers } from "../../config";
import { generateTable } from "../utils";

@Module("Core", "This is the core module!", ModuleOptions.AlwaysOn | ModuleOptions.Hidden)
@injectable()
export class CoreModule extends IModule
{
    @Command("list roles")
    @CommandSample("list roles")
    @CommandDescription("Lists every user's role.")
    private handleListRoles(message: IMessage)
    {
        const server = message.server as DBServer;
        const tmp = [];

        for (const user of server.users) {
            if (user.getRole(server) === RoleType.Normal) {
                continue;
            }

            tmp.push(user);
        }

        tmp.sort((a, b) => {
            return a.getRole(server) - b.getRole(server);
        });

        const columns = { name: "Name", role: "Role" };
        const data = [];

        for (const user of tmp) {
            data.push({
                name: user.getName(server),
                role: RoleType[user.getRole(server)]
            });
        }

        const messages = generateTable(this._bot.get(TemplateManager).get(TemplateMessageID.ListRoles, {
            author: message.author.id,
        }), columns, data, { name: 30, role: 15 });

        this._bot.get(DiscordAPI).respond(message, messages);
    }

    @Command("list permissions")
    @CommandSample("list permissions")
    @CommandDescription("Lists the available permissions for each role.")
    private handleListPermissions(message: IMessage, args: { [key: string]: any })
    {
        // const server = message.server;
        // const adminPermissions = PermissionManager.instance.getRole(RoleType.Admin).getPermissions(server);

        // const columns = { permission: "Permission", roles: "Roles" };
        // const data = [];
        // const roles = [
        //     PermissionManager.instance.getRole(RoleType.Admin),
        //     PermissionManager.instance.getRole(RoleType.Moderator),
        //     PermissionManager.instance.getRole(RoleType.Normal),
        // ];

        // for (const key in adminPermissions) {
        //     if (!adminPermissions[key]) {
        //         continue;
        //     }

        //     let tmp = "";
        //     for (const role of roles) {
        //         if (!role.isAllowed(server, key))
        //             continue;

        //         if (tmp.length !== 0)
        //             tmp += " ";

        //         tmp += role;
        //     }

        //     data.push({
        //         permission: key.toLowerCase(),
        //         roles: tmp,
        //     });
        // }

        // data.sort((a, b) => {
        //     if (a.roles.length < b.roles.length) {
        //         return -1;
        //     }

        //     if (a.roles.length > b.roles.length) {
        //         return 1;
        //     }

        //     if (a.permission < b.permission) {
        //         return -1;
        //     }

        //     if (a.permission > b.permission) {
        //         return 1;
        //     }

        //     return 0;
        // });

        // const messages = generateTable(PersonalityManager.instance.get(MessageID.ListPermissions, {
        //     author: message.author.id,
        // }), columns, data, { permission: 20, roles: 15 });

        // this._bot.respond(message, messages);
    }

    @Command("show ignore list")
    @Command("list ignores")
    @Command("show ignorelist")
    @CommandSample("show ignore list")
    @CommandDescription("Shows the list of people I'm currently ignoring!")
    private handleShowIgnorelist(message: IMessage, args: { [key: string]: any })
    {
        // let response = "``` ";

        // for (let i = 0; i < message.server.ignoreList.length; i++) {
        //     if (i !== 0)
        //         response += "\r\n";

        //     response += UserManager.instance.getUserById(message.server.ignoreList[i], message.server).getDetailedName(message.server);
        // }

        // response += "```";

        // if (message.server.ignoreList.length === 0) {
        //     this._bot.respond(message, PersonalityManager.instance.get(MessageID.IgnoreListEmpty, { author: message.author.id }));
        // } else {
        //     this._bot.respond(message, PersonalityManager.instance.get(MessageID.ListIgnores, { author: message.author.id, list: response }));
        // }
    }

    @Command(["please help", { please: true }], CommandOptions.HideInHelp | CommandOptions.Global)
    @Command(["hilfe", { german: true }])
    @Command(["please show help", { please: true }])
    @Command(["hilfe bitte", { german: true, please: true }])
    @Command(["help me please", { please: true }])
    @Command(["please help me", { please: true }])
    @Command("help")
    @Command("help me")
    @Command("show help")
    @Command(["助けて", { japanese: true }])
    @Command(["助けてください", { japanese: true, please: true }])
    private handleHelp(message: IMessage, japanese = false, german = false, please = false)
    {
        let response = "";

        if (please) {
            response = this._bot.get(TemplateManager).get(TemplateMessageID.PleaseHelpTop, { author: message.author.id }) as string;
        } else {
            response = this._bot.get(TemplateManager).get(TemplateMessageID.HelpTop, { author: message.author.id }) as string;
        }

        const messageQueue = [];
        const role = message.user.getRole(message.server);
        let modules = [];

        for (const key of this._bot.modules) {
            const module: IModule = this._bot.get(key);
            const enabled = (message.server === null) ? false : message.server.isModuleEnabled(module.name);

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

                    tmp += "**" + identifiers[0] + command.sample + "** - " + command.description;
                    tmp += "\r\n";
                }
            }

            if (!hasNonHidden) {
                continue;
            }

            if (response.length + tmp.length >= 1900) {
                messageQueue.push(response);
                response = "";
            }

            response += "**" + module.name + "**:\r\n";
            response += tmp;
            response += "\r\n";
        }

        let add = "";
        if (message.server !== null) {
            add += "**Enabled modules**: " + modules.join(", ") + "\r\n\r\n";
        }

        if (please) {
            add += this._bot.get(TemplateManager).get(TemplateMessageID.PleaseHelpBottom, { author: message.author.id }) as string;
        } else {
            add += this._bot.get(TemplateManager).get(TemplateMessageID.HelpBottom, { author: message.author.id }) as string;
        }

        if (response.length + add.length >= 1900) {
            messageQueue.push(response);
            messageQueue.push(add);
        } else {
            messageQueue.push(response + add);
        }

        this._bot.get(DiscordAPI).respond(message, messageQueue).catch((err) => {
            console.log("err", err);
        });
    }

    @Command("set response mode to {responsetype!type}")
    @Command("use {responsetype!type}")
    @Command("use {responsetype!type} mode")
    @CommandDescription("Change my personality to Normal or Tsundere")
    @CommandSample("set response mode to __*tsundere*__")
    @CommandPermission("CHANGE_PERSONALITY")
    private handleResponseMode(message: IMessage, type: string)
    {
        if (type === null) {
            //unknown response mode
        }

        // if (Responses.currentMode === args.type)
        //     return this._bot.respond(message, StringFormat(Responses.get("ALREADY_IN_MODE"), { author: message.author.id }));

        // Responses.setMode(args.type);
        // this._bot.respond(message, StringFormat(Responses.get("SWITCHED"), { author: message.author.id }));
    }

    @Command("what is my role")
    @CommandSample("what is my role?")
    @CommandDescription("Displays your role.")
    private handleMyRole(message: IMessage)
    {
        const role: string = RoleType[message.user.getRole(message.server)];

        this._bot.get(DiscordAPI).respond(message, this._bot.get(TemplateManager).get(TemplateMessageID.CurrentUserRole, {
            author: message.author.id,
            role,
        }));
    }

    @Command("what are my permissions")
    @Command("show my permissions")
    @Command("show my permission list")
    @Command("show my permissions list")
    @Command("list my permissions")
    @Command("show permissions")
    @CommandDescription("Displays your role's permissions.")
    @CommandSample("what are my permissions?")
    private handleMyPermissions(message: IMessage, args: { [key: string]: any })
    {
        // const server = message.server;
        // const role = PermissionManager.instance.getRole(message.user.getRole(server));
        // const list = role.getPermissions(server);

        // let response = "```";

        // for (const key in list) {
        //     if (key.toUpperCase() === "BLACKLIST_SERVERS" || key.toUpperCase() === "BLACKLIST_USERS")
        //         continue;

        //     let name = key;
        //     while (name.length !== 20)
        //         name += " ";

        //     response += "\r\n";
        //     response += name;
        //     response += list[key] ? " (allowed)" : " (not allowed)";
        // }
        // response += "```";

        // this._bot.respond(message, PersonalityManager.instance.get(MessageID.CurrentUserPermissions, {
        //     author: message.author.id,
        //     permissions: response,
        // }));
    }

    @Command("go to {channelid!channel} <for {category}>")
    @CommandDescription("Tells me to output to the specified channel.")
    @CommandSample("go to __*#channel*__")
    @CommandPermission("GO_TO_CHANNEL")
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
