import { Responses, ResponseType } from "../responses";
import { Permissions } from "../permissions";
import { Users } from "../users";
import { Config } from "../../config";
import { GenerateTable, StringFormat } from "../util";
import { ModuleBase, MessageInterface } from "../modulebase";

export class CoreModule extends ModuleBase {
    constructor() {
        super();

        this._name = "Core";
        this._description = "This is the core module! Cannot be disabled.";
        this._alwaysOn = true;
        this._hidden = true;

        this._permissions.register("CHANGE_PERSONALITY", "moderator");

        this.add_command({
            defaults: { please: false, german: false },
            formats: [
                ["please help", { please: true }],
                ["hilfe", { german: true }],
                ["please show help", { please: true }],
                ["hilfe bitte", { german: true, please: true }],
                ["help me please", { please: true }],
                ["please help me", { please: true }],
                "help",
                "help me",
                "show help"
            ],
            hideInHelp: true,
            permission: null,
            global: true,

            execute: this.handle_help_me
        });

        this.add_command({
            defaults: { on: false },
            formats: [
                ["tsundere on", { on: true }],
                "tsundere off"
            ],
            hideInHelp: true,
            permission: "CHANGE_PERSONALITY",
            global: false,

            execute: this.handle_tsundere
        });

        this.add_command({
            defaults: {},
            formats: [
                "what is my role"
            ],
            sample: "what is my role?",
            description: "Displays your role.",
            permission: null,
            global: false,

            execute: this.handle_my_role
        });

        this.add_command({
            defaults: {},
            formats: [
                "what are my permissions",
                "show my permissions",
                "show my permission list",
                "show my permissions list",
                "list my permissions",
                "show permissions"
            ],
            sample: "what are my permissions?",
            description: "Displays your role's permissions.",
            permission: null,
            global: false,

            execute: this.handle_my_permissions
        });

        this.add_command({
            defaults: {},
            formats: [
                "list roles"
            ],
            sample: "list roles",
            description: "Lists every user's role.",
            permission: null,
            global: false,

            execute: this.handle_list_roles
        });

        this.add_command({
            defaults: {},
            formats: [
                "list permissions"
            ],
            sample: "list permissions",
            description: "Lists the available permissions for each role.",
            permission: null,
            global: false,

            execute: this.handle_list_permissions
        });

        this.add_command({
            defaults: {},
            formats: [
                "show ignore list",
                "list ignores",
                "show ignorelist"
            ],
            sample: "show ignore list",
            description: "Shows the list of people I'm currently ignoring!",
            permission: null,
            global: false,

            execute: this.handle_show_ignorelist
        });

        this.add_command({
            formats: [
                "go to {channelid!channel}"
            ],
            sample: "go to __*#channel*__",
            description: "Tells me to output to the specified channel.",
            permission: "GO_TO_CHANNEL",
            global: false,

            execute: this.handle_goto_channel
        });
    }

    handle_list_roles(message: MessageInterface, args: { [key: string]: any }) {
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

        for (let i = 0; i < tmp.length; i++) {
            data.push({ name: tmp[i].get_name_detailed(server), role: tmp[i].get_role(server) });
        }

        let messages = GenerateTable(StringFormat(Responses.get("LIST_ROLES"), { author: message.author.id }), columns, data, { name: 30, role: 15 });
        this._bot.respondQueue(message, messages);
    }

    handle_list_permissions(message: MessageInterface, args: { [key: string]: any }) {
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
            if (a.roles.length < b.roles.length) return -1;
            if (a.roles.length > b.roles.length) return 1;
            if (a.permission < b.permission) return -1;
            if (a.permission > b.permission) return 1;
            return 0;
        });

        let messages = GenerateTable(StringFormat(Responses.get("LIST_PERMISSIONS"), { author: message.author.id }), columns, data, { permission: 20, roles: 15 });
        this._bot.respondQueue(message, messages);
    }

    handle_show_ignorelist(message: MessageInterface, args: { [key: string]: any }) {
        let response = "``` ";

        for (let i = 0; i < message.server.ignoreList.length; i++) {
            if (i !== 0)
                response += "\r\n";

            response += Users.getUser(message.server.ignoreList[i], message.server).getDetailedName(message.server);
        }

        response += "```";

        if (message.server.ignoreList.length === 0)
            this._bot.respond(message, StringFormat(Responses.get("IGNORE_LIST_EMPTY"), { author: message.author.id }));
        else
            this._bot.respond(message, StringFormat(Responses.get("SHOW_IGNORELIST"), { author: message.author.id, list: response }));
    }

    handle_help_me(message: MessageInterface, args: { [key: string]: any }) {
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
            for (let i = 0; i < module.commands.length; i++) {
                if (module.commands[i].permission !== null && !this._permissions.isAllowed(module.commands[i].permission, role, message.server))
                    continue;

                if (module.commands[i].hideInHelp === undefined || module.commands[i].hideInHelp === false) {
                    let is_private = module.commands[i].private !== undefined && module.commands[i].private === true;

                    if (message.server !== null && is_private)
                        continue;

                    if (module.commands[i].global === false && !enabled)
                        continue;

                    hasNonHidden = true;

                    tmp += "**" + Config.identifiers[0] + module.commands[i].sample + "** - " + module.commands[i].description;
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

    handle_tsundere(message: MessageInterface, args: { [key: string]: any }) {
        if (args.on) {
            if (Responses.currentMode)
                return this._bot.respond(message, StringFormat(Responses.get("ALREADY_IN_MODE"), { author: message.author.id }));

            Responses.setMode(ResponseType.Tsundere);
            this._bot.respond(message, StringFormat(Responses.get("SWITCHED"), { author: message.author.id }));
        }
        else {
            if (!Responses.currentMode)
                return this._bot.respond(message, StringFormat(Responses.get("ALREADY_IN_MODE"), { author: message.author.id }));

            Responses.setMode(ResponseType.Normal);
            this._bot.respond(message, StringFormat(Responses.get("SWITCHED"), { author: message.author.id }));
        }
    }

    handle_my_role(message: MessageInterface, args: { [key: string]: any }) {
        let role = message.user.getRole(message.server);
        if (role === "superadmin")
            role = "Superadmin";
        else if (role === "admin")
            role = "Admin";
        else if (role === "moderator")
            role = "Moderator";
        else
            role = "Normal";

        this._bot.respond(message, StringFormat(Responses.get("MY_ROLE"), { author: message.author.id, role: role }));
    }

    handle_my_permissions(message: MessageInterface, args: { [key: string]: any }) {
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

    handle_goto_channel(message: MessageInterface, args: { [key: string]: any }) {
        let id = args.channel;
        if (message.server._server.channels.get(id) === null)
            return this._bot.respond(message, StringFormat(Responses.get("INVALID_CHANNEL"), { author: message.author.id, channel: args.channel }));

        message.server.channel = id;
        this._bot.message(StringFormat(Responses.get("OUTPUT_CHANNEL"), { author: message.author.id, channel: id }), message.server);
    }

    onSetup() {
        this._bot.setStatus("Online");
    }
}
