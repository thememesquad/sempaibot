import { Command } from "../core/command/attributes/command";
import { CommandDescription } from "../core/command/attributes/commanddescription";
import { CommandSample } from "../core/command/attributes/commandexample";
import { CommandPermission } from "../core/command/attributes/commandpermission";
import { Module } from "../core/module/attributes/module";
import { IMessageInterface } from "../core/module/messageinterface";
import { ModuleBase } from "../core/module/modulebase";
import { ModuleOptions } from "../core/module/moduleoptions";
import { PermissionManager } from "../core/permission/manager";
import { RoleType } from "../core/permission/roletype";
import { MessageID } from "../core/personality/messageid";
import { PersonalityManager } from "../core/personality/personalitymanager";
import { UserManager } from "../core/user/usermanager";
import { GenerateTable } from "../core/utils/util";

@Module("Core", "This is the core module!", ModuleOptions.AlwaysOn | ModuleOptions.Hidden)
export class CoreModule extends ModuleBase {
    constructor() {
        super();

        PermissionManager.instance.register("CHANGE_PERSONALITY", RoleType.Moderator);
    }

    @Command("list roles")
    @CommandSample("list roles")
    @CommandDescription("Lists every user's role.")
    private handleListRoles(message: IMessageInterface, args: { [key: string]: any }) {
        const server = message.server;
        const tmp = [];

        for (const key of server.server.members.keyArray()) {
            const member = server.server.members.get(key);
            const user = UserManager.instance.getUser(member.user, server);

            if (member.id === this._bot.user._userID)
                continue;

            if (user.getRole(server) === RoleType.Normal)
                continue;

            tmp.push(user);
        }

        tmp.sort((a, b) => {
            return a.get_role_id(server) - b.get_role_id(server);
        });

        const columns = { name: "Name", role: "Role" };
        const data = [];

        for (const dat of tmp)
            data.push({ name: dat.get_name_detailed(server), role: dat.get_role(server) });

        const messages = GenerateTable(PersonalityManager.instance.get(MessageID.ListRoles, {
            author: message.author.id,
        }), columns, data, { name: 30, role: 15 });

        this._bot.respond(message, messages);
    }

    @Command("list permissions")
    @CommandSample("list permissions")
    @CommandDescription("Lists the available permissions for each role.")
    private handleListPermissions(message: IMessageInterface, args: { [key: string]: any }) {
        const server = message.server;
        const adminPermissions = PermissionManager.instance.getRole(RoleType.Admin).getPermissions(server);

        const columns = { permission: "Permission", roles: "Roles" };
        const data = [];
        const roles = [
            PermissionManager.instance.getRole(RoleType.Admin),
            PermissionManager.instance.getRole(RoleType.Moderator),
            PermissionManager.instance.getRole(RoleType.Normal),
        ];

        for (const key in adminPermissions) {
            if (!adminPermissions[key])
                continue;

            let tmp = "";
            for (const role of roles) {
                if (!role.isAllowed(server, key))
                    continue;

                if (tmp.length !== 0)
                    tmp += " ";

                tmp += role;
            }

            data.push({
                permission: key.toLowerCase(),
                roles: tmp,
            });
        }

        data.sort((a, b) => {
            if (a.roles.length < b.roles.length)
                return -1;

            if (a.roles.length > b.roles.length)
                return 1;

            if (a.permission < b.permission)
                return -1;

            if (a.permission > b.permission)
                return 1;

            return 0;
        });

        const messages = GenerateTable(PersonalityManager.instance.get(MessageID.ListPermissions, {
            author: message.author.id,
        }), columns, data, { permission: 20, roles: 15 });

        this._bot.respond(message, messages);
    }

    @Command("show ignore list")
    @Command("list ignores")
    @Command("show ignorelist")
    @CommandSample("show ignore list")
    @CommandDescription("Shows the list of people I'm currently ignoring!")
    private handleShowIgnorelist(message: IMessageInterface, args: { [key: string]: any }) {
        let response = "``` ";

        for (let i = 0; i < message.server.ignoreList.length; i++) {
            if (i !== 0)
                response += "\r\n";

            response += UserManager.instance.getUserById(message.server.ignoreList[i], message.server).getDetailedName(message.server);
        }

        response += "```";

        if (message.server.ignoreList.length === 0)
            this._bot.respond(message, PersonalityManager.instance.get(MessageID.IgnoreListEmpty, { author: message.author.id }));
        else
            this._bot.respond(message, PersonalityManager.instance.get(MessageID.ListIgnores, { author: message.author.id, list: response }));
    }

    /*@Command(["please help", { please: true }], CommandOptions.HideInHelp | CommandOptions.Global)
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
    private handleHelp(message: MessageInterface, args: { [key: string]: any }) {
        let response = "";

        if (args.please)
            response = StringFormat(Responses.get("PLEASE_HELP_TOP"), { author: message.author.id });
        else
            response = StringFormat(Responses.get("HELP_TOP"), { author: message.author.id });

        let message_queue = [];
        let role = message.user.getRole(message.server);
        let modules = "";
        for (let key in this._bot.modules) {
            let module = this._bot.modules[key];
            let enabled = (message.server === null) ? false : message.server.isModuleEnabled(module.name);

            if (enabled) {
                if (modules.length !== 0)
                    modules += ", ";

                modules += key;
            }

            let hasNonHidden = false;
            let tmp = "";
            for (let key in module.commands) {
                let command = module.commands[key];

                if (command.permission !== null && !this._permissions.isAllowed(command.permission as string, role, message.server))
                    continue;

                if (command.hideInHelp === undefined || command.hideInHelp === false) {
                    let is_private = command.private !== undefined && command.private === true;

                    if (message.server !== null && is_private)
                        continue;

                    if (command.global === false && !enabled)
                        continue;

                    hasNonHidden = true;

                    tmp += "**" + Config.identifiers[0] + command.sample + "** - " + command.description;
                    tmp += "\r\n";
                }
            }

            if (!hasNonHidden)
                continue;

            if (response.length + tmp.length >= 1900) {
                message_queue.push(response);
                response = "";
            }

            response += "**" + key + "**:\r\n";
            response += tmp;
            response += "\r\n";
        }

        let add = "";
        if (message.server !== null)
            add += "**Enabled modules**: " + modules + "\r\n\r\n";

        if (args.please)
            add += StringFormat(Responses.get("PLEASE_HELP_BOTTOM"), { author: message.author.id });
        else
            add += StringFormat(Responses.get("HELP_BOTTOM"), { author: message.author.id });

        if (response.length + add.length >= 1900) {
            message_queue.push(response);
            message_queue.push(add);
        }
        else {
            message_queue.push(response + add);
        }

        this._bot.respond(message, message_queue).catch(err => {
            console.log("err", err);
        });
    }*/

    /*@Command("set response mode to {responsetype!type}")
    @Command("use {responsetype!type}")
    @Command("use {responsetype!type} mode")
    @CommandDescription("Change my personality to Normal or Tsundere")
    @CommandSample("set response mode to __*tsundere*__")
    @CommandPermission("CHANGE_PERSONALITY")
    private handleResponseMode(message: MessageInterface, args: { [key: string]: any }) {
        if (args.type === null) {
            //unknown response mode
        }

        if (Responses.currentMode === args.type)
            return this._bot.respond(message, StringFormat(Responses.get("ALREADY_IN_MODE"), { author: message.author.id }));

        Responses.setMode(args.type);
        this._bot.respond(message, StringFormat(Responses.get("SWITCHED"), { author: message.author.id }));
    }*/

    @Command("what is my role")
    @CommandSample("what is my role?")
    @CommandDescription("Displays your role.")
    private handleMyRole(message: IMessageInterface, args: { [key: string]: any }) {
        const role: string = RoleType[message.user.getRole(message.server)];

        this._bot.respond(message, PersonalityManager.instance.get(MessageID.CurrentUserRole, {
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
    private handleMyPermissions(message: IMessageInterface, args: { [key: string]: any }) {
        const server = message.server;
        const role = PermissionManager.instance.getRole(message.user.getRole(server));
        const list = role.getPermissions(server);

        let response = "```";

        for (const key in list) {
            if (key.toUpperCase() === "BLACKLIST_SERVERS" || key.toUpperCase() === "BLACKLIST_USERS")
                continue;

            let name = key;
            while (name.length !== 20)
                name += " ";

            response += "\r\n";
            response += name;
            response += list[key] ? " (allowed)" : " (not allowed)";
        }
        response += "```";

        this._bot.respond(message, PersonalityManager.instance.get(MessageID.CurrentUserPermissions, {
            author: message.author.id,
            permissions: response,
        }));
    }

    @Command("go to {channelid!channel}")
    @CommandDescription("Tells me to output to the specified channel.")
    @CommandSample("go to __*#channel*__")
    @CommandPermission("GO_TO_CHANNEL")
    private handleGotoChannel(message: IMessageInterface, args: { [key: string]: any }) {
        const id = args.channel;
        if (message.server.server.channels.get(id) === null)
            return this._bot.respond(message, PersonalityManager.instance.get(MessageID.InvalidChannel, {
                author: message.author.id,
                channel: args.channel,
            }));

        message.server.channel = id;
        this._bot.message(PersonalityManager.instance.get(MessageID.SempaiHomeChannelChanged, {
            author: message.author.id,
            channel: id,
        }), message.server);
    }
}
