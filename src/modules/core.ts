import { Responses, ResponseType } from "../responses";
import { Permissions } from "../permissions";
import { Users } from "../users";
import { Config } from "../../config";
import { GenerateTable, StringFormat } from "../util";
import { ModuleBase, MessageInterface, Module, ModuleOptions, Command, CommandDescription, CommandSample, CommandPermission, CommandOptions } from "../modulebase";

@Module("Core", "This is the core module!", ModuleOptions.AlwaysOn | ModuleOptions.Hidden)
export class CoreModule extends ModuleBase {
    constructor() {
        super();

        this._permissions.register("CHANGE_PERSONALITY", "moderator");
    }

    @Command("list roles")
    @CommandSample("list roles")
    @CommandDescription("Lists every user's role.")
    private handleListRoles(message: MessageInterface, args: { [key: string]: any }) {
        let server = message.server;
        let tmp = [];

        for (let key of server._server.members.keyArray()) {
            let member = server._server.members.get(key);
            let user = Users.getUser(member.user, server);

            if (member.id === this._bot.user._userID)
                continue;

            if (user.getRoleId(server) === 0)
                continue;

            tmp.push(user);
        }

        tmp.sort((a, b) => {
            return a.get_role_id(server) - b.get_role_id(server);
        });

        let columns = { name: "Name", role: "Role" };
        let data = [];

        for (let i = 0; i < tmp.length; i++)
            data.push({ name: tmp[i].get_name_detailed(server), role: tmp[i].get_role(server) });

        let messages = GenerateTable(StringFormat(Responses.get("LIST_ROLES"), { author: message.author.id }), columns, data, { name: 30, role: 15 });
        this._bot.respondQueue(message, messages);
    }

    @Command("list permissions")
    @CommandSample("list permissions")
    @CommandDescription("Lists the available permissions for each role.")
    private handleListPermissions(message: MessageInterface, args: { [key: string]: any }) {
        let server = message.server;
        let admin_permissions = this._permissions.getRole("admin").getPermissions(server);

        let columns = { permission: "Permission", roles: "Roles" };
        let data = [];
        let roles = ["admin", "moderator", "normal"];

        for (let key in admin_permissions) {
            if (!admin_permissions[key])
                continue;

            let tmp = "";
            for (let i = 0; i < roles.length; i++) {
                let role = roles[i];

                if (!this._permissions.getRole(role).isAllowed(server, key))
                    continue;

                if (tmp.length !== 0)
                    tmp += " ";

                tmp += role;
            }

            data.push({ permission: key.toLowerCase(), roles: tmp });
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

        let messages = GenerateTable(StringFormat(Responses.get("LIST_PERMISSIONS"), { author: message.author.id }), columns, data, { permission: 20, roles: 15 });
        this._bot.respondQueue(message, messages);
    }

    @Command("show ignore list")
    @Command("list ignores")
    @Command("show ignorelist")
    @CommandSample("show ignore list")
    @CommandDescription("Shows the list of people I'm currently ignoring!")
    private handleShowIgnorelist(message: MessageInterface, args: { [key: string]: any }) {
        let response = "``` ";

        for (let i = 0; i < message.server.ignoreList.length; i++) {
            if (i !== 0)
                response += "\r\n";

            response += Users.getUserById(message.server.ignoreList[i], message.server).getDetailedName(message.server);
        }

        response += "```";

        if (message.server.ignoreList.length === 0)
            this._bot.respond(message, StringFormat(Responses.get("IGNORE_LIST_EMPTY"), { author: message.author.id }));
        else
            this._bot.respond(message, StringFormat(Responses.get("SHOW_IGNORELIST"), { author: message.author.id, list: response }));
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

        this._bot.respondQueue(message, message_queue).catch(err => {
            console.log("err", err);
        });
    }

    @Command("set response mode to {responsetype!type}")
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
    }

    private static _jsUcfirst(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    @Command("what is my role")
    @CommandSample("what is my role?")
    @CommandDescription("Displays your role.")
    private handleMyRole(message: MessageInterface, args: { [key: string]: any }) {
        let role = CoreModule._jsUcfirst(message.user.getRole(message.server).toLowerCase());
        this._bot.respond(message, StringFormat(Responses.get("MY_ROLE"), { author: message.author.id, role: role }));
    }

    @Command("what are my permissions")
    @Command("show my permissions")
    @Command("show my permission list")
    @Command("show my permissions list")
    @Command("list my permissions")
    @Command("show permissions")
    @CommandDescription("Displays your role's permissions.")
    @CommandSample("what are my permissions?")
    private handleMyPermissions(message: MessageInterface, args: { [key: string]: any }) {
        let server = message.server;
        let role = this._permissions.getRole(message.user.getRole(server));
        let list = role.getPermissions(server);

        let response = "```";

        for (let key in list) {
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

        this._bot.respond(message, StringFormat(Responses.get("MY_PERMISSIONS"), { author: message.author.id, permissions: response }));
    }

    @Command("go to {channelid!channel}")
    @CommandDescription("Tells me to output to the specified channel.")
    @CommandSample("go to __*#channel*__")
    @CommandPermission("GO_TO_CHANNEL")
    private handleGotoChannel(message: MessageInterface, args: { [key: string]: any }) {
        let id = args.channel;
        if (message.server._server.channels.get(id) === null)
            return this._bot.respond(message, StringFormat(Responses.get("INVALID_CHANNEL"), { author: message.author.id, channel: args.channel }));

        message.server.channel = id;
        this._bot.message(StringFormat(Responses.get("OUTPUT_CHANNEL"), { author: message.author.id, channel: id }), message.server);
    }

    public onSetup() {
        this._bot.setStatus("Online");
    }
}
