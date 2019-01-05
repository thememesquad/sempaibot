import { Module } from "../core/attributes/module";
import { ModuleOptions } from "../core/moduleoptions";
import { IModule } from "../core/imodule";
import { AccessManager, TemplateManager } from "../core/managers";
import { Command, CommandSample, CommandDescription, CommandOptions, CommandPermission } from "../core/command";
import { IMessage } from "../core/imessage";
import { DBServer } from "../models/dbserver";
import { RoleType, roleNames } from "../core/roletype";
import { injectable } from "inversify";
import { TemplateMessageID } from "../core/itemplatemessageid";
import { DiscordAPI } from "../api/discord";
import { identifiers } from "../../config";
import { generateTable } from "../utils";

@Module("Core", "This is the core module!", ModuleOptions.AlwaysOn)
@injectable()
export class CoreModule extends IModule
{
    @Command("list roles")
    @CommandSample("list roles")
    @CommandDescription("Lists every user's role.")
    private async handleListRoles(message: IMessage)
    {
        const server = message.server as DBServer;
        const tmp = [];
        const users = await server.users;

        for (const user of users) {
            const role = await user.getRole(server);

            if (role === RoleType.Normal) {
                continue;
            }

            (user as any).__role = role;
            tmp.push(user);
        }

        tmp.sort((a, b) => {
            return (a as any).__role - (b as any).__role;
        });

        const columns = { name: "Name", role: "Role" };
        const data = [];

        for (const user of tmp) {
            data.push({
                name: user.getName(server),
                role: RoleType[(user as any).__role]
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
    private async handleListPermissions(message: IMessage)
    {
        const server = message.server;
        const adminPermissions = await server.getRolePermissions(RoleType.Admin);

        const columns = { permission: "Permission", roles: "Roles" };
        const data = [];
        const roles = [
            RoleType.Admin,
            RoleType.Moderator,
            RoleType.Normal,
        ];

        for (const key in adminPermissions) {
            let tmp = "";
            for (const role of roles) {
                if (!await server.isAllowed(role, adminPermissions[key])) {
                    continue;
                }

                if (tmp.length !== 0) {
                    tmp += " ";
                }

                tmp += RoleType[role];
            }

            data.push({
                permission: adminPermissions[key].toLowerCase(),
                roles: tmp,
            });
        }

        data.sort((a, b) => {
            if (a.roles.length < b.roles.length) {
                return -1;
            }

            if (a.roles.length > b.roles.length) {
                return 1;
            }

            if (a.permission < b.permission) {
                return -1;
            }

            if (a.permission > b.permission) {
                return 1;
            }

            return 0;
        });

        const messages = generateTable(this._bot.get(TemplateManager).get(TemplateMessageID.ListPermissions, {
            author: message.author.id,
        }), columns, data, { permission: 20, roles: 15 });

        this._bot.get(DiscordAPI).respond(message, messages);
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
    @Command(["hilfe", { language: "german" }])
    @Command(["please show help", { please: true }])
    @Command(["hilfe bitte", { language: "german", please: true }])
    @Command(["help me please", { please: true }])
    @Command(["please help me", { please: true }])
    @Command("help")
    @Command("help me")
    @Command("show help")
    @Command(["助けて", { language: "japanese" }])
    @Command(["助けてください", { language: "japanese", please: true }])
    private async handleHelp(message: IMessage, language = "default", please = false)
    {
        let messageIds: { [key: string]: { [key: number]: { [key: string]: TemplateMessageID } } } = {
            "default": {
                [1]: {
                    "top": TemplateMessageID.PleaseHelpTop,
                    "bottom": TemplateMessageID.PleaseHelpBottom
                },
                [0]: {
                    "top": TemplateMessageID.HelpTop,
                    "bottom": TemplateMessageID.HelpBottom
                }
            }
        }

        if (messageIds[language] === undefined) {
            language = "default";
        }

        let response = this._bot.get(TemplateManager).get(messageIds[language][+please]["top"], {
            author: message.author.id
        });

        const messageQueue = [];
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

                    tmp += `[${module.name}] **${command.sample}** - ${command.description}\r\n`;
                }
            }

            if (!hasNonHidden) {
                continue;
            }

            if (response.length + tmp.length >= 1900) {
                messageQueue.push(response);
                response = "";
            }

            response += tmp;
        }

        let add = "";
        if (message.server !== null) {
            add += "**Enabled modules**: " + modules.join(", ") + "\r\n\r\n";
        }

        add += this._bot.get(TemplateManager).get(messageIds[language][+please]["bottom"], { author: message.author.id });

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

    @Command("what is my role")
    @CommandSample("what is my role?")
    @CommandDescription("Displays your role.")
    private async handleMyRole(message: IMessage)
    {
        const role: string = RoleType[await message.user.getRole(message.server)];

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
    private async handleMyPermissions(message: IMessage)
    {
        const server = message.server;
        const defaultList = (await server.getRolePermissions(RoleType.Admin)).map(x => x.toUpperCase());
        const list = (await server.getRolePermissions(await message.user.getRole(server))).map(x => x.toUpperCase());

        let response = [];
        for (const index in defaultList) {
            let name = defaultList[index];

            if (defaultList.indexOf(name) === -1) {
                continue;
            }

            while (name.length !== 20) {
                name += " ";
            }

            response.push({
                "permission": name.toLowerCase(),
                "allowed": list.indexOf(defaultList[index]) !== -1 ? "Allowed" : "Not allowed"
            });
        }

        const table = generateTable(this._bot.get(TemplateManager).get(TemplateMessageID.CurrentUserPermissions, {
            author: message.author.id
        }), { "permission": "Permission", "allowed": "Allowed" }, response);

        this._bot.get(DiscordAPI).respond(message, table);
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
