import { ModuleBase, MessageInterface } from "../modulebase";
import { Responses } from "../responses";
import { Users } from "../users";
import { StringFormat, GenerateTable } from "../util";

export class AdminModule extends ModuleBase {
    constructor() {
        super();

        this._name = "Admin";
        this._description = "This is the permissions and roles module! Cannot be disabled.";
        this._alwaysOn = true;
        this._hidden = true;

        this._permissions.register("SUPERADMIN", "superadmin");
        this._permissions.register("IGNORE_USERS", "moderator");
        this._permissions.register("GO_TO_CHANNEL", "moderator");
        this._permissions.register("MANAGE_MODULES", "admin");
        this._permissions.register("MANAGE_PERMISSIONS", "admin");
        this._permissions.register("ASSIGN_ROLES", "admin");

        this.addCommand({
            formats: [
                "show statistics"
            ],
            sample: "show statistics",
            description: "Shows statistics for me server-wide.",
            permission: "SUPERADMIN",
            global: true,

            execute: this.handle_show_statistics
        });

        this.addCommand({
            formats: [
                "list servers",
                "show servers"
            ],
            sample: "list servers",
            description: "Lists all the servers I'm currently running on.",
            permission: "SUPERADMIN",
            global: true,

            execute: this.handle_list_servers
        });

        this.addCommand({
            formats: [
                "blacklist server {int!server}"
            ],
            sample: "blacklist server __*server*__",
            description: "Blacklists a server.",
            permission: "SUPERADMIN",
            global: true,

            execute: this.handle_blacklist_server
        });

        this.addCommand({
            formats: [
                "whitelist server {int!server}"
            ],
            sample: "whitelist server __*server*__",
            description: "Whitelists a server.",
            permission: "SUPERADMIN",
            global: true,

            execute: this.handle_whitelist_server
        });

        this.addCommand({
            formats: [
                "blacklist user {userid!user}"
            ],
            sample: "blacklist user __*@user*__",
            description: "Blacklists an user.",
            permission: "SUPERADMIN",
            global: true,

            execute: this.handle_blacklist_user
        });

        this.addCommand({
            formats: [
                "whitelist user {userid!user}"
            ],
            sample: "whitelist user __*@user*__",
            description: "Whitelists an user.",
            permission: "SUPERADMIN",
            global: true,

            execute: this.handle_whitelist_user
        });

        this.addCommand({
            formats: [
                "show user blacklist"
            ],
            sample: "show user blacklist",
            description: "Displays the user blacklist",
            permission: "SUPERADMIN",
            global: true,

            execute: this.handle_show_user_blacklist
        });

        this.addCommand({
            formats: [
                "show server blacklist"
            ],
            sample: "show server blacklist",
            description: "Displays the server blacklist",
            permission: "SUPERADMIN",
            global: true,

            execute: this.handle_show_server_blacklist
        });

        this.addCommand({
            formats: [
                "enable {module}",
                "enable module {module}"
            ],
            sample: "enable __*module name*__",
            description: "Enables a module for this server.",
            permission: "MANAGE_MODULES",
            global: false,

            execute: this.handle_enable_module
        });

        this.addCommand({
            formats: [
                "disable {module}",
                "disable module {module}"
            ],
            sample: "disable __*module name*__",
            description: "Disables the specified module for this server.",
            permission: "MANAGE_MODULES",
            global: false,

            execute: this.handle_disable_module
        });

        this.addCommand({
            formats: [
                "assign role {role} to user {userid!user}",
                "assign {role} to user {userid!user}",
                "assign role {role} to {userid!user}",
                "assign {role} to {userid!user}",
                "assign {role} {userid!user}"
            ],
            sample: "assign __*role*__ to __*@user*__",
            description: "Assigns the specified role to the specified user.",
            permission: "ASSIGN_ROLES",
            global: false,

            execute: this.handle_assign_role
        });

        this.addCommand({
            formats: [
                "add permission {permission} to role {role}",
                "add {permission} to role {role}",
                "add permission {permission} to {role}",
                "add {permission} {role}"
            ],
            sample: "add __*permission*__ to __*role*__",
            description: "Adds the specified permission to the specified role.",
            permission: "MANAGE_PERMISSIONS",
            global: false,

            execute: this.handle_add_permission
        });

        this.addCommand({
            formats: [
                "remove permission {permission} from role {role}",
                "remove {permission} from role {role}",
                "remove permission {permission} from {role}",
                "remove {permission} {role}"
            ],
            sample: "remove __*permission*__ from __*role*__",
            description: "Removes the specified permission from the specified role.",
            permission: "MANAGE_PERMISSIONS",
            global: false,

            execute: this.handle_remove_permission
        });

        this.addCommand({
            formats: [
                "list modules",
                "show modules"
            ],
            sample: "list modules",
            description: "Lists all available modules.",
            permission: "MANAGE_MODULES",
            global: false,

            execute: this.handle_list_modules
        });

        this.addCommand({
            formats: [
                "ignore {userid!user}",
                "start ignoring {userid!user}"
            ],
            sample: "ignore __*@user*__",
            description: "Ignores the specified user.",
            permission: "IGNORE_USERS",
            global: false,

            execute: this.handle_ignore_user
        });

        this.addCommand({
            formats: [
                "unignore {userid!user}",
                "stop ignoring {userid!user}"
            ],
            sample: "unignore __*@user*__",
            description: "Stops ignoring the specified user.",
            permission: "IGNORE_USERS",
            global: false,

            execute: this.handle_unignore_user
        });
    }

    handle_blacklist_server(message: MessageInterface, args: { [key: string]: any }) {
        let server = this._bot.getInternalServer(args.server - 1);

        if (server === null)
            return this._bot.respond(message, StringFormat(Responses.get("INVALID_SERVER"), { author: message.author.id, id: args.server }));

        if (this._bot.isServerBlacklisted(server.id))
            return this._bot.respond(message, StringFormat(Responses.get("SERVER_ALREADY_BLACKLISTED"), { author: message.author.id, server_name: server._server.name }));

        this._bot.blacklistServer(server.id);
        this._bot.respond(message, StringFormat(Responses.get("SERVER_BLACKLISTED"), { author: message.author.id, server_name: server._server.name }));
    }

    handle_whitelist_server(message: MessageInterface, args: { [key: string]: any }) {
        let server = this._bot.getInternalServer(args.server - 1);

        if (server === null)
            return this._bot.respond(message, StringFormat(Responses.get("INVALID_SERVER"), { author: message.author.id, id: args.server }));

        if (!this._bot.isServerBlacklisted(server.id))
            return this._bot.respond(message, StringFormat(Responses.get("SERVER_NOT_BLACKLISTED"), { author: message.author.id, server_name: server._server.name }));

        this._bot.whitelistServer(server.id);
        this._bot.respond(message, StringFormat(Responses.get("SERVER_WHITELISTED"), { author: message.author.id, server_name: server._server.name }));
    }

    handle_blacklist_user(message: MessageInterface, args: { [key: string]: any }) {
        let user = Users.getUser(args.user, message.server);
        if (user === null)
            return this._bot.respond(message, StringFormat(Responses.get("INVALID_USER"), { author: message.author.id, user: args.user }));

        this._bot.blacklistUser(user);
        return this._bot.respond(message, StringFormat(Responses.get("BLACKLISTED_USER"), { author: message.author.id, user: user._userID }));
    }

    handle_whitelist_user(message: MessageInterface, args: { [key: string]: any }) {
        let user = Users.getUser(args.user, message.server);
        if (user === null)
            return this._bot.respond(message, StringFormat(Responses.get("INVALID_USER"), { author: message.author.id, user: args.user }));

        this._bot.whitelistUser(user);
        return this._bot.respond(message, StringFormat(Responses.get("WHITELISTED_USER"), { author: message.author.id, user: user._userID }));
    }

    handle_show_user_blacklist(message: MessageInterface, args: { [key: string]: any }) {
        let id = "ID";
        let name = "Name";

        while (id.length < 25)
            id += " ";

        while (name.length < 30)
            name += " ";

        let response = "```";
        response += id + " " + name;

        let num = 0;
        for (let key in Users.users) {
            if (!this._bot.isUserBlacklisted(Users.users[key]))
                continue;

            id = "" + Users.users[key]._userID;
            name = Users.users[key]._name;

            while (id.length < 25)
                id += " ";

            while (name.length < 30)
                name += " ";

            response += "\r\n";
            response += id + " " + name;
            num++;
        }

        if (num === 0) {
            response += "\r\n";
            response += "User blacklist is empty.";
        }

        response += "```";

        this._bot.respond(message, StringFormat(Responses.get("USER_BLACKLIST"), { author: message.author.id, response: response }));
    }

    handle_show_server_blacklist(message: MessageInterface, args: { [key: string]: any }) {
        let id = "ID";
        let name = "Name";
        let owner = "Owner";

        while (id.length < 10)
            id += " ";

        while (name.length < 20)
            name += " ";

        while (owner.length < 20)
            owner += " ";

        let response = "```";
        response += id + " " + name + " " + owner;

        let num = 0;
        for (let i = 0; i < this._bot.internalServers.length; i++) {
            if (!this._bot.isServerBlacklisted(this._bot.internalServers[i].id))
                continue;

            id = "#" + (i + 1) + ".";
            name = this._bot.internalServers[i]._server.name;
            owner = this._bot.internalServers[i]._server.owner.displayName;

            while (id.length < 10)
                id += " ";

            while (name.length < 20)
                name += " ";

            while (owner.length < 20)
                owner += " ";

            response += "\r\n";
            response += id + " " + name + " " + owner;
            num++;
        }

        if (num === 0) {
            response += "\r\n";
            response += "Server blacklist is empty.";
        }
        response += "```";

        this._bot.respond(message, StringFormat(Responses.get("SERVER_BLACKLIST"), { author: message.author.id, response: response }));
    }

    handle_show_statistics(message: MessageInterface, args: { [key: string]: any }) {
        let msg = StringFormat(Responses.get("SHOW_STATISTICS"), {
            author: message.author.id,
            num_servers: 0,//stats.get_value("num_servers"),
            osu_num_users: 0,//stats.get_value("osu_num_users"),
            osu_last_minute: 0,//stats.get_value("osu_api_calls"),
            osu_average_day: 0,//stats.get_average_day_value("osu_api_calls"),
            osu_average_week: 0,//stats.get_average_week_value("osu_api_calls"),
            osu_average_month: 0,//stats.get_average_month_value("osu_api_calls"),
            osu_highest_day: 0,//stats.get_highest_day_value("osu_api_calls"),
            osu_highest_week: 0,//stats.get_highest_week_value("osu_api_calls"),
            osu_highest_month: 0,//stats.get_highest_month_value("osu_api_calls"),
            osu_last_day: 0,//stats.get_day_value("osu_api_calls"),
            osu_last_week: 0,//stats.get_week_value("osu_api_calls"),
            osu_last_month: 0,//stats.get_month_value("osu_api_calls"),
            osu_alltime: 0,//stats.get_alltime_value("osu_api_calls"),
            osu_api_queue: 0//this._bot.getModule("osu!").load_balancer.numRequests
        });

        this._bot.respond(message, msg);
    }

    handle_list_servers(message: MessageInterface, args: { [key: string]: any }) {
        let data = [];
        for (let i = 0; i < this._bot.internalServers.length; i++) {
            if (this._bot.isServerBlacklisted(this._bot.internalServers[i].id)) {
                continue;
            }

            data.push({
                id: "#" + (i + 1) + ".",
                name: this._bot.internalServers[i]._server.name,
                owner: this._bot.internalServers[i]._server.owner.nickname || this._bot.internalServers[i]._server.owner.user.username,
                limit: "50"//"" + this._bot.internalServers[i].config.value.osu_limit
            });
        }

        let messages = GenerateTable(StringFormat(Responses.get("LIST_SERVERS"), { author: message.author.id }), { id: "ID", name: "Name", owner: "Owner", limit: "Limit" }, data);
        this._bot.respondQueue(message, messages);
    }

    handle_enable_module(message: MessageInterface, args: { [key: string]: any }) {
        if (this._bot.getModule(args.module) === null) {
            return this._bot.respond(message, StringFormat(Responses.get("MODULE_INVALID"), { author: message.author.id, module: args.module }));
        }

        if (message.server.isModuleEnabled(args.module)) {
            return this._bot.respond(message, StringFormat(Responses.get("MODULE_ALREADY_ENABLED"), { author: message.author.id, module: args.module }));
        }

        message.server.enableModule(args.module);
        return this._bot.respond(message, StringFormat(Responses.get("MODULE_ENABLED"), { author: message.author.id, module: args.module }));
    }

    handle_disable_module(message: MessageInterface, args: { [key: string]: any }) {
        let module = this._bot.getModule(args.module);
        if (module === null) {
            return this._bot.respond(message, StringFormat(Responses.get("MODULE_INVALID"), { author: message.author.id, module: args.module }));
        }

        if (!message.server.isModuleEnabled(args.module)) {
            return this._bot.respond(message, StringFormat(Responses.get("MODULE_NOT_ENABLED"), { author: message.author.id, module: args.module }));
        }

        if (module.alwaysOn) {
            return this._bot.respond(message, StringFormat(Responses.get("MODULE_ALWAYS_ON"), { author: message.author.id, module: args.module }));
        }

        message.server.disableModule(args.module);
        return this._bot.respond(message, StringFormat(Responses.get("MODULE_DISABLED"), { author: message.author.id, module: args.module }));
    }

    handle_list_modules(message: MessageInterface, args: { [key: string]: any }) {
        let columns = { name: "Name", enabled: "Enabled", flags: "Flags" };
        let data = [];

        for (let key in this._bot.modules) {
            let enabled = message.server.isModuleEnabled(key);
            let always_on = this._bot.modules[key].alwaysOn;
            let default_on = this._bot.modules[key].defaultOn;
            let hidden = this._bot.modules[key].hidden;

            if (hidden)
                continue;

            let flags = "";
            if (always_on)
                flags += "always_on";

            if (default_on)
                flags += flags.length === 0 ? "default_on" : " default_on";

            data.push({ name: key, enabled: (enabled) ? "yes" : "no", flags: flags });
        }

        let messages = GenerateTable(StringFormat(Responses.get("MODULE_LIST"), { author: message.author.id }), columns, data, { name: 20, enabled: 10, flags: 15 });
        this._bot.respondQueue(message, messages);
    }

    handle_assign_role(message: MessageInterface, args: { [key: string]: any }) {
        args.role = args.role.toLowerCase();

        let role_id = 0;
        switch (args.role) {
            case "superadmin":
                return this._bot.respond(message, StringFormat(Responses.get("INVALID_ROLE"), { author: message.author.id, role: args.role }));

            case "admin":
                role_id = 1;
                break;

            case "moderator":
                role_id = 2;
                break;

            default:
                role_id = 3;
                break;
        }

        let my_role = message.user.getRoleId(message.server);
        if (role_id < my_role) {
            return this._bot.respond(message, StringFormat(Responses.get("NOT_ALLOWED"), { author: message.author.id }));
        }

        let user = Users.getUser(args.user, message.server);
        if (user === null) {
            return this._bot.respond(message, StringFormat(Responses.get("INVALID_USER"), { author: message.author.id, user: args.user }));
        }

        if (user.getRole(message.server) === args.role) {
            return this._bot.respond(message, StringFormat(Responses.get("ROLE_ALREADY_ASSIGNED"), { author: message.author.id, role: args.role, user: args.user }));
        }

        if (!Users.assignRole(user._userID, message.server, args.role)) {
            return this._bot.respond(message, StringFormat(Responses.get("ERROR"), { author: message.author.id }));
        }

        return this._bot.respond(message, StringFormat(Responses.get("ROLE_ASSIGNED"), { author: message.author.id, role: args.role, user: args.user }));
    }

    handle_add_permission(message: MessageInterface, args: { [key: string]: any }) {
        args.permission = args.permission.toUpperCase();
        args.role = args.role.toLowerCase();

        let role_id = 0;
        switch (args.role) {
            case "superadmin":
                return this._bot.respond(message, StringFormat(Responses.get("INVALID_ROLE"), { author: message.author.id, role: args.role }));

            case "admin":
                role_id = 1;
                break;

            case "moderator":
                role_id = 2;
                break;

            default:
                role_id = 3;
                break;
        }

        let my_role = message.user.getRoleId(message.server);
        if (role_id < my_role) {
            return this._bot.respond(message, StringFormat(Responses.get("NOT_ALLOWED"), { author: message.author.id }));
        }

        if (!this._permissions.isAllowed(args.permission, message.user.getRole(message.server), message.server)) {
            return this._bot.respond(message, StringFormat(Responses.get("NOT_ALLOWED"), { author: message.author.id }));
        }

        this._permissions.add(args.permission, args.role, message.server);
        this._bot.respond(message, StringFormat(Responses.get("ADDED_PERMISSION"), { author: message.author.id, permission: args.permission, role: args.role }));
    }

    handle_remove_permission(message: MessageInterface, args: { [key: string]: any }) {
        args.permission = args.permission.toUpperCase();
        args.role = args.role.toLowerCase();

        let role_id = 0;
        switch (args.role) {
            case "superadmin":
                return this._bot.respond(message, StringFormat(Responses.get("INVALID_ROLE"), { author: message.author.id, role: args.role }));

            case "admin":
                role_id = 1;
                break;

            case "moderator":
                role_id = 2;
                break;

            default:
                role_id = 3;
                break;
        }

        let my_role = message.user.getRoleId(message.server);
        if (role_id < my_role) {
            return this._bot.respond(message, StringFormat(Responses.get("NOT_ALLOWED"), { author: message.author.id }));
        }

        if (!this._permissions.isAllowed(args.permission, message.user.getRole(message.server), message.server)) {
            return this._bot.respond(message, StringFormat(Responses.get("NOT_ALLOWED"), { author: message.author.id }));
        }

        this._permissions.remove(args.permission, args.role, message.server);
        this._bot.respond(message, StringFormat(Responses.get("REMOVED_PERMISSION"), { author: message.author.id, permission: args.permission, role: args.role }));
    }

    handle_ignore_user(message: MessageInterface, args: { [key: string]: any }) {
        let user = Users.getUserById(args.user, message.server);
        if (user === null) {
            return this._bot.respond(message, StringFormat(Responses.get("INVALID_USER"), { author: message.author.id, user: args.user }));
        }

        if (message.user.getRoleId(message.server) >= user.getRoleId(message.server)) {
            return this._bot.respond(message, StringFormat(Responses.get("NOT_ALLOWED"), { author: message.author.id }));
        }

        message.server.ignoreUser(user);
        return this._bot.respond(message, StringFormat(Responses.get("STARTED_IGNORING"), { author: message.author.id, user: user._userID }));
    }

    handle_unignore_user(message: MessageInterface, args: { [key: string]: any }) {
        let user = Users.getUserById(args.user, message.server);
        if (user === null) {
            return this._bot.respond(message, StringFormat(Responses.get("INVALID_USER"), { author: message.author.id, user: args.user }));
        }

        if (message.user.getRoleId(message.server) >= user.getRoleId(message.server)) {
            return this._bot.respond(message, StringFormat(Responses.get("NOT_ALLOWED"), { author: message.author.id }));
        }

        message.server.unignoreUser(user);
        return this._bot.respond(message, StringFormat(Responses.get("STOPPED_IGNORING"), { author: message.author.id, user: user._userID }));
    }
}
